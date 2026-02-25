import {
  AppsV1Api,
  CoreV1Api,
  KubeConfig,
  V1ContainerStatus,
  V1Pod,
} from '@kubernetes/client-node'
import { ContainerState } from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

export const DEFAULT_NAMESPACE = process.env.K8S_NAMESPACE || 'default'
export const DEMO_APP_LABEL_SELECTOR = process.env.DEMO_APP_LABEL_SELECTOR || 'app=demo-app'

const kubeConfig = new KubeConfig()

try {
  kubeConfig.loadFromCluster()
  logger.info('Initialized Kubernetes client from in-cluster service account')
} catch (error) {
  logger.warn('Failed to load in-cluster Kubernetes config, falling back to default kubeconfig', {
    error: error instanceof Error ? error.message : 'Unknown error',
  })
  kubeConfig.loadFromDefault()
}

export const coreApi = kubeConfig.makeApiClient(CoreV1Api)
export const appsApi = kubeConfig.makeApiClient(AppsV1Api)

export async function listDemoAppPods(): Promise<V1Pod[]> {
  const api = coreApi as any

  try {
    const response = await api.listNamespacedPod({
      namespace: DEFAULT_NAMESPACE,
      labelSelector: DEMO_APP_LABEL_SELECTOR,
    })
    return extractPodItems(response)
  } catch {
    const response = await api.listNamespacedPod(
      DEFAULT_NAMESPACE,
      undefined,
      undefined,
      undefined,
      undefined,
      DEMO_APP_LABEL_SELECTOR
    )
    return extractPodItems(response)
  }
}

function extractPodItems(response: unknown): V1Pod[] {
  if (response && typeof response === 'object') {
    const maybeItems = (response as { items?: V1Pod[] }).items
    if (Array.isArray(maybeItems)) {
      return maybeItems
    }

    const bodyItems = (response as { body?: { items?: V1Pod[] } }).body?.items
    if (Array.isArray(bodyItems)) {
      return bodyItems
    }
  }

  return []
}

export function getPrimaryContainerName(pod: V1Pod): string {
  return pod.spec?.containers?.[0]?.name || pod.metadata?.name || 'demo-app'
}

export function getPrimaryContainerStatus(pod: V1Pod): V1ContainerStatus | undefined {
  const primaryContainerName = getPrimaryContainerName(pod)
  return pod.status?.containerStatuses?.find((status) => status.name === primaryContainerName)
}

export function resolvePodState(pod: V1Pod): ContainerState {
  const phase = (pod.status?.phase || '').toLowerCase()
  const containerStatus = getPrimaryContainerStatus(pod)

  if (containerStatus?.state?.running) {
    return ContainerState.RUNNING
  }

  if (containerStatus?.state?.waiting?.reason?.toLowerCase().includes('crashloop')) {
    return ContainerState.RESTARTING
  }

  if (containerStatus?.state?.terminated) {
    return ContainerState.EXITED
  }

  if (phase === 'running') {
    return ContainerState.RUNNING
  }

  if (phase === 'pending' || phase === 'unknown') {
    return ContainerState.RESTARTING
  }

  if (phase === 'failed') {
    return ContainerState.EXITED
  }

  if (phase === 'succeeded') {
    return ContainerState.STOPPED
  }

  return ContainerState.STOPPED
}

export function parseCpuQuantityToCores(quantity?: string): number {
  if (!quantity) {
    return 0
  }

  const trimmed = quantity.trim()
  if (trimmed.endsWith('m')) {
    const millicores = Number.parseFloat(trimmed.slice(0, -1))
    return Number.isFinite(millicores) ? millicores / 1000 : 0
  }

  const cores = Number.parseFloat(trimmed)
  return Number.isFinite(cores) ? cores : 0
}

export function parseMemoryQuantityToBytes(quantity?: string): number {
  if (!quantity) {
    return 0
  }

  const trimmed = quantity.trim()
  const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)([A-Za-z]+)?$/)
  if (!match) {
    return 0
  }

  const value = Number.parseFloat(match[1])
  if (!Number.isFinite(value)) {
    return 0
  }

  const unit = match[2] || ''

  const binaryMultipliers: Record<string, number> = {
    Ki: 1024,
    Mi: 1024 ** 2,
    Gi: 1024 ** 3,
    Ti: 1024 ** 4,
    Pi: 1024 ** 5,
    Ei: 1024 ** 6,
  }

  const decimalMultipliers: Record<string, number> = {
    K: 1000,
    M: 1000 ** 2,
    G: 1000 ** 3,
    T: 1000 ** 4,
    P: 1000 ** 5,
    E: 1000 ** 6,
  }

  if (unit in binaryMultipliers) {
    return Math.round(value * binaryMultipliers[unit])
  }

  if (unit in decimalMultipliers) {
    return Math.round(value * decimalMultipliers[unit])
  }

  return Math.round(value)
}
