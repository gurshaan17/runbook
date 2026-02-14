import { V1Pod } from '@kubernetes/client-node'
import { ContainerLog, LogLevel } from '@runbook/shared-types'
import {
  coreApi,
  DEFAULT_NAMESPACE,
  getPrimaryContainerName,
  listDemoAppPods,
} from '../k8s/client.js'
import { logger } from '../utils/logger.js'

export async function getContainerLogs(
  containerId: string,
  lines: number = 100,
  levelFilter: string = 'ALL'
): Promise<{
  success: boolean
  logs: ContainerLog[]
  totalLines: number
  error?: string
}> {
  try {
    logger.info('Fetching container logs', { containerId, lines, levelFilter })

    const pods = await listDemoAppPods()
    const targetPods = selectPods(pods, containerId)

    if (targetPods.length === 0) {
      throw new Error(`No pods found for selector app=demo-app (containerId=${containerId})`)
    }

    const normalizedFilter = levelFilter.toUpperCase()
    const parsedLogs: ContainerLog[] = []

    for (const pod of targetPods) {
      const podName = pod.metadata?.name
      if (!podName) {
        continue
      }

      const rawLogs = await readPodLog(podName, lines)
      for (const line of rawLogs.split('\n')) {
        const cleanLine = line.trim()
        if (!cleanLine) {
          continue
        }

        const parsed = parseLogLine(cleanLine)

        if (normalizedFilter !== 'ALL' && parsed.level !== normalizedFilter) {
          continue
        }

        parsed.containerId = podName
        parsed.containerName = getPrimaryContainerName(pod)
        parsedLogs.push(parsed)
      }
    }

    parsedLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    const limitedLogs = parsedLogs.slice(0, lines)

    logger.info('Logs fetched successfully', {
      containerId,
      totalLines: limitedLogs.length,
      podsQueried: targetPods.length,
    })

    return {
      success: true,
      logs: limitedLogs,
      totalLines: limitedLogs.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch logs', { containerId, error: errorMessage })

    return {
      success: false,
      logs: [],
      totalLines: 0,
      error: errorMessage,
    }
  }
}

function selectPods(pods: V1Pod[], containerId: string): V1Pod[] {
  if (pods.length === 0) {
    return []
  }

  const normalized = containerId.trim()
  if (!normalized || normalized === 'demo-app') {
    return pods
  }

  const exactMatches = pods.filter((pod) => pod.metadata?.name === normalized)
  if (exactMatches.length > 0) {
    return exactMatches
  }

  const partialMatches = pods.filter((pod) => (pod.metadata?.name || '').includes(normalized))
  if (partialMatches.length > 0) {
    return partialMatches
  }

  return pods
}

async function readPodLog(podName: string, tailLines: number): Promise<string> {
  const api = coreApi as any

  try {
    const response = await api.readNamespacedPodLog({
      name: podName,
      namespace: DEFAULT_NAMESPACE,
      tailLines,
      timestamps: true,
    })
    return extractLogBody(response)
  } catch {
    const response = await api.readNamespacedPodLog(
      podName,
      DEFAULT_NAMESPACE,
      undefined,
      false,
      undefined,
      undefined,
      undefined,
      false,
      undefined,
      tailLines,
      true
    )
    return extractLogBody(response)
  }
}

function extractLogBody(response: unknown): string {
  if (typeof response === 'string') {
    return response
  }

  if (response && typeof response === 'object') {
    const body = (response as { body?: unknown }).body
    if (typeof body === 'string') {
      return body
    }
  }

  return ''
}

function parseLogLine(line: string): ContainerLog {
  const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/)
  const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString()

  let level: LogLevel = LogLevel.INFO
  const upperLine = line.toUpperCase()

  if (upperLine.includes('ERROR') || upperLine.includes('[ERROR]')) {
    level = LogLevel.ERROR
  } else if (upperLine.includes('WARN') || upperLine.includes('[WARN]')) {
    level = LogLevel.WARN
  } else if (upperLine.includes('DEBUG') || upperLine.includes('[DEBUG]')) {
    level = LogLevel.DEBUG
  } else if (upperLine.includes('FATAL') || upperLine.includes('[FATAL]')) {
    level = LogLevel.FATAL
  } else if (upperLine.includes('INFO') || upperLine.includes('[INFO]')) {
    level = LogLevel.INFO
  }

  let message = line
  if (timestampMatch) {
    message = line.substring(timestampMatch[0].length).trim()
  }

  return {
    timestamp,
    level,
    message,
  }
}
