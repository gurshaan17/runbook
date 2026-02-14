import { V1Pod } from '@kubernetes/client-node'
import { validateAction } from '../safety/validator.js'
import { RestartContainerOutput } from '@runbook/shared-types'
import { deleteDemoAppPods, listDemoAppPods } from '../k8s/client.js'
import { logger } from '../utils/logger.js'

const RESTART_READY_TIMEOUT_MS = Number(process.env.RESTART_READY_TIMEOUT_MS || 15000)
const RESTART_POLL_INTERVAL_MS = Number(process.env.RESTART_POLL_INTERVAL_MS || 500)

export async function restartContainer(
  containerId: string,
  reason?: string
): Promise<RestartContainerOutput> {
  try {
    logger.info('Attempting to restart container', { containerId, reason })

    const validation = await validateAction('restart', { containerId })
    if (!validation.allowed) {
      logger.warn('Restart action blocked by safety validator', {
        containerId,
        reason: validation.reason,
      })

      return {
        success: false,
        containerId,
        containerName: '',
        previousState: '',
        newState: '',
        timestamp: new Date().toISOString(),
        message: `Action blocked: ${validation.reason}`,
      }
    }

    const podsBeforeDelete = await listDemoAppPods()
    const targetPods = selectTargetPods(podsBeforeDelete, containerId)

    if (targetPods.length === 0) {
      throw new Error(`No demo-app pods found for containerId: ${containerId}`)
    }

    const previousState = targetPods[0].status?.phase || 'Unknown'
    const previousPodNames = new Set<string>(
      targetPods
        .map((pod) => pod.metadata?.name)
        .filter((podName): podName is string => Boolean(podName))
    )
    const fieldSelector = resolveFieldSelector(targetPods, containerId)

    await deleteDemoAppPods(fieldSelector)

    const deadline = Date.now() + RESTART_READY_TIMEOUT_MS
    let latestPods = await listDemoAppPods()
    let runningPod = findRunningReplacement(latestPods, previousPodNames)

    while (!runningPod && Date.now() < deadline) {
      await sleep(RESTART_POLL_INTERVAL_MS)
      latestPods = await listDemoAppPods()
      runningPod = findRunningReplacement(latestPods, previousPodNames)
    }

    if (!runningPod) {
      throw new Error(
        `Pods did not reach running state within ${RESTART_READY_TIMEOUT_MS}ms after restart`
      )
    }

    const newState = runningPod.status?.phase || 'Running'
    const newContainerId = runningPod.metadata?.name || containerId

    logger.info('Container restarted successfully', {
      containerId,
      newContainerId,
      previousState,
      newState,
    })

    return {
      success: true,
      containerId: newContainerId,
      containerName: 'demo-app',
      previousState,
      newState,
      timestamp: new Date().toISOString(),
      message: `Restarted demo-app pod(s). Previous state: ${previousState}, New state: ${newState}`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to restart container', { containerId, error: errorMessage })

    return {
      success: false,
      containerId,
      containerName: '',
      previousState: '',
      newState: '',
      timestamp: new Date().toISOString(),
      message: `Failed to restart container: ${errorMessage}`,
    }
  }
}

function selectTargetPods(pods: V1Pod[], containerId: string): V1Pod[] {
  if (containerId === 'demo-app') {
    return pods
  }

  const exact = pods.filter((pod) => pod.metadata?.name === containerId)
  if (exact.length > 0) {
    return exact
  }

  const partial = pods.filter((pod) => (pod.metadata?.name || '').includes(containerId))
  if (partial.length > 0) {
    return partial
  }

  return pods
}

function resolveFieldSelector(targetPods: V1Pod[], containerId: string): string | undefined {
  if (containerId === 'demo-app') {
    return undefined
  }

  if (targetPods.length === 1) {
    const podName = targetPods[0].metadata?.name
    if (podName) {
      return `metadata.name=${podName}`
    }
  }

  return undefined
}

function findRunningReplacement(pods: V1Pod[], previousPodNames: Set<string>): V1Pod | undefined {
  const newRunning = pods.find((pod) => {
    const podName = pod.metadata?.name || ''
    return !previousPodNames.has(podName) && pod.status?.phase === 'Running'
  })

  if (newRunning) {
    return newRunning
  }

  return pods.find((pod) => pod.status?.phase === 'Running')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
