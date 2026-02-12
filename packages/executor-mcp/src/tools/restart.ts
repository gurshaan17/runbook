import { getDockerClient } from '../docker/client.js'
import { validateAction } from '../safety/validator.js'
import { RestartContainerOutput } from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

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

    // Restart the container
    await container.restart()

    // Wait a moment for restart to complete
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Get new state
    const newInfo = await container.inspect()
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