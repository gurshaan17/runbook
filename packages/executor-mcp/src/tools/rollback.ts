import { getDockerClient } from '../docker/client.js'
import { validateAction } from '../safety/validator.js'
import { RollbackDeploymentOutput } from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

export async function rollbackDeployment(
  serviceName: string,
  reason?: string
): Promise<RollbackDeploymentOutput> {
  try {
    logger.info('Attempting to rollback deployment', { serviceName, reason })

    // Validate action
    const validation = await validateAction('rollback', { serviceName })
    if (!validation.allowed) {
      logger.warn('Rollback action blocked by safety validator', {
        serviceName,
        reason: validation.reason,
      })

      return {
        success: false,
        serviceName,
        previousImage: '',
        currentImage: '',
        timestamp: new Date().toISOString(),
        message: `Action blocked: ${validation.reason}`,
      }
    }

    const docker = getDockerClient()

    // Find containers for this service
    const containers = await docker.listContainers({ all: true })
    const serviceContainers = containers.filter((c) =>
      c.Names.some((name) => name.includes(serviceName))
    )

    if (serviceContainers.length === 0) {
      throw new Error(`No containers found for service: ${serviceName}`)
    }

    // Get current image
    const currentImage = serviceContainers[0].Image

    logger.info('Current service image', { serviceName, currentImage })

    // For a real rollback, we'd need to:
    // 1. Keep track of previous image versions (in a database or file)
    // 2. Pull the previous image
    // 3. Recreate containers with previous image

    // For this demo, we'll simulate by noting the current image
    // In production, you'd integrate with docker-compose or kubernetes

    return {
      success: false,
      serviceName,
      previousImage: 'unknown',
      currentImage,
      timestamp: new Date().toISOString(),
      message: `Rollback not fully implemented. Current image: ${currentImage}. In production, this would pull and deploy the previous image version. Use docker-compose or kubernetes for proper rollback support.`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to rollback deployment', { serviceName, error: errorMessage })

    return {
      success: false,
      serviceName,
      previousImage: '',
      currentImage: '',
      timestamp: new Date().toISOString(),
      message: `Failed to rollback deployment: ${errorMessage}`,
    }
  }
}