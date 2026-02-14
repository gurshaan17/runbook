import { ContainerMetrics, ContainerState } from '@runbook/shared-types'
import { V1Pod } from '@kubernetes/client-node'
import {
  getPrimaryContainerName,
  listDemoAppPods,
  parseCpuQuantityToCores,
  parseMemoryQuantityToBytes,
  resolvePodState,
} from '../k8s/client.js'
import { logger } from '../utils/logger.js'

const DEMO_APP_METRICS_URL = process.env.DEMO_APP_METRICS_URL || 'http://demo-app:3000/metrics'
const DEFAULT_MEMORY_LIMIT_BYTES = Number(
  process.env.DEMO_APP_MEMORY_LIMIT_BYTES || 512 * 1024 * 1024
)

const previousCpuSamples = new Map<string, { cpuSeconds: number; timestampMs: number }>()

export async function getContainerMetrics(
  containerId: string
): Promise<{
  success: boolean
  metrics?: ContainerMetrics
  containerName?: string
  state?: ContainerState
  error?: string
}> {
  try {
    logger.info('Fetching container metrics', { containerId })

    const pods = await listDemoAppPods()
    const pod = selectPod(pods, containerId)

    if (!pod) {
      throw new Error('No demo-app pods found in Kubernetes')
    }

    const containerName = getPrimaryContainerName(pod)
    const state = resolvePodState(pod)

    if (state !== ContainerState.RUNNING) {
      return {
        success: true,
        containerName,
        state,
        metrics: {
          cpu: 0,
          memory: 0,
          memoryUsage: 0,
          memoryLimit: 0,
          network: 0,
          timestamp: new Date().toISOString(),
        },
      }
    }

    const response = await fetch(DEMO_APP_METRICS_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch metrics endpoint: HTTP ${response.status}`)
    }

    const metricsText = await response.text()

    const memoryUsageMb = getPromMetricValue(metricsText, 'demo_app_memory_usage_mb')
    const memoryUsage = Math.max(memoryUsageMb, 0) * 1024 * 1024

    const memoryLimit = resolveMemoryLimitBytes(pod)
    const memoryPercent =
      memoryLimit > 0 ? Math.min((memoryUsage / memoryLimit) * 100, 100) : 0

    const cpuSecondsTotal = getCpuSecondsTotal(metricsText)
    const cpuLimitCores = resolveCpuLimitCores(pod)
    const cpuPercent = computeCpuPercent(
      pod.metadata?.name || containerId,
      cpuSecondsTotal,
      Date.now(),
      cpuLimitCores
    )

    const metrics: ContainerMetrics = {
      cpu: parseFloat(cpuPercent.toFixed(2)),
      memory: parseFloat(memoryPercent.toFixed(2)),
      memoryUsage: Math.round(memoryUsage),
      memoryLimit,
      network: 0,
      timestamp: new Date().toISOString(),
    }

    logger.info('Metrics fetched successfully', {
      containerId,
      containerName,
      cpu: metrics.cpu,
      memory: metrics.memory,
    })

    return {
      success: true,
      metrics,
      containerName,
      state,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch metrics', { containerId, error: errorMessage })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

function selectPod(pods: V1Pod[], containerId: string): V1Pod | undefined {
  if (pods.length === 0) {
    return undefined
  }

  const normalized = containerId.trim()
  if (normalized && normalized !== 'demo-app') {
    const exact = pods.find((pod) => pod.metadata?.name === normalized)
    if (exact) {
      return exact
    }

    const partial = pods.find((pod) => (pod.metadata?.name || '').includes(normalized))
    if (partial) {
      return partial
    }
  }

  return (
    pods.find((pod) => resolvePodState(pod) === ContainerState.RUNNING) ||
    pods[0]
  )
}

function getPromMetricValue(payload: string, metricName: string): number {
  const regex = new RegExp(`^${metricName}(?:\\{[^}]*\\})?\\s+([-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)$`, 'm')
  const match = payload.match(regex)

  if (!match) {
    return 0
  }

  const value = Number.parseFloat(match[1])
  return Number.isFinite(value) ? value : 0
}

function getCpuSecondsTotal(metricsPayload: string): number {
  const total = getPromMetricValue(metricsPayload, 'demo_app_process_cpu_seconds_total')
  if (total > 0) {
    return total
  }

  const user = getPromMetricValue(metricsPayload, 'demo_app_process_cpu_user_seconds_total')
  const system = getPromMetricValue(metricsPayload, 'demo_app_process_cpu_system_seconds_total')
  return user + system
}

function resolveMemoryLimitBytes(pod: V1Pod): number {
  const limit = pod.spec?.containers?.[0]?.resources?.limits?.memory

  if (typeof limit !== 'string') {
    return DEFAULT_MEMORY_LIMIT_BYTES
  }

  const parsed = parseMemoryQuantityToBytes(limit)
  return parsed > 0 ? parsed : DEFAULT_MEMORY_LIMIT_BYTES
}

function resolveCpuLimitCores(pod: V1Pod): number {
  const limit = pod.spec?.containers?.[0]?.resources?.limits?.cpu

  if (typeof limit !== 'string') {
    return 1
  }

  const parsed = parseCpuQuantityToCores(limit)
  return parsed > 0 ? parsed : 1
}

function computeCpuPercent(
  podKey: string,
  cpuSecondsTotal: number,
  timestampMs: number,
  cpuLimitCores: number
): number {
  const previous = previousCpuSamples.get(podKey)
  previousCpuSamples.set(podKey, { cpuSeconds: cpuSecondsTotal, timestampMs })

  if (!previous || cpuSecondsTotal <= 0) {
    return 0
  }

  const elapsedSeconds = (timestampMs - previous.timestampMs) / 1000
  if (elapsedSeconds <= 0) {
    return 0
  }

  const cpuDelta = cpuSecondsTotal - previous.cpuSeconds
  if (cpuDelta <= 0) {
    return 0
  }

  const coresConsumed = cpuDelta / elapsedSeconds
  const normalizedLimit = cpuLimitCores > 0 ? cpuLimitCores : 1
  const percent = (coresConsumed / normalizedLimit) * 100

  return Math.max(0, percent)
}
