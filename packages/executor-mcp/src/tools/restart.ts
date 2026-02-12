import { getDockerClient } from '../docker/client.js'
import { validateAction } from '../safety/validator.js'
import { RestartContainerOutput } from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

const RESTART_TIMEOUT_SECONDS = Number(process.env.RESTART_TIMEOUT_SECONDS || 10)
const RESTART_READY_TIMEOUT_MS = Number(process.env.RESTART_READY_TIMEOUT_MS || 15000)
const RESTART_POLL_INTERVAL_MS = Number(process.env.RESTART_POLL_INTERVAL_MS || 500)

export async function restartContainer(
  containerId: string,
  reason?: string
): Promise<RestartContainerOutput> {
  try {
    logger.info('Attempting to restart container', { containerId, reason })

    // Validate action
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

    const docker = getDockerClient()
    const container = docker.getContainer(containerId)

    // Get container info before restart
    const info = await container.inspect()
    const containerName = info.Name.replace(/^\//, '')
    const previousState = info.State.Status

    logger.info('Container info retrieved', {
      containerId,
      containerName,
      previousState,
    })

    // Bound restart call with Docker's timeout option.
    await container.restart({ t: RESTART_TIMEOUT_SECONDS })

    // Poll container state until it is running or timeout elapses.
    const deadline = Date.now() + RESTART_READY_TIMEOUT_MS
    let newInfo = await container.inspect()
    while (
      !(newInfo.State.Running || newInfo.State.Status === 'running') &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, RESTART_POLL_INTERVAL_MS))
      newInfo = await container.inspect()
    }

    if (!(newInfo.State.Running || newInfo.State.Status === 'running')) {
      throw new Error(
        `Container did not reach running state within ${RESTART_READY_TIMEOUT_MS}ms after restart`
      )
    }

    const newState = newInfo.State.Status

    logger.info('Container restarted successfully', {
      containerId,
      containerName,
      previousState,
      newState,
    })

    return {
      success: true,
      containerId,
      containerName,
      previousState,
      newState,
      timestamp: new Date().toISOString(),
      message: `Container ${containerName} restarted successfully. Previous state: ${previousState}, New state: ${newState}`,
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
