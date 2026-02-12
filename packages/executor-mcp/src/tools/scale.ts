import { getDockerClient } from '../docker/client.js'
import { validateAction } from '../safety/validator.js'
import { SAFETY_LIMITS } from '../safety/limits.js'
import { logger } from '../utils/logger.js'
import { ScaleServiceOutput } from '@runbook/shared-types'

export async function scaleService(
  serviceName: string,
  replicas: number,
  reason?: string
): Promise<ScaleServiceOutput> {
  try {
    logger.info('Attempting to scale service', { serviceName, replicas, reason })

    // Validate replicas count
    if (replicas < SAFETY_LIMITS.MIN_REPLICAS || replicas > SAFETY_LIMITS.MAX_REPLICAS) {
      const message = `Replica count ${replicas} outside allowed range (${SAFETY_LIMITS.MIN_REPLICAS}-${SAFETY_LIMITS.MAX_REPLICAS})`
      logger.warn('Scale action blocked by limits', { serviceName, replicas })

      return {
        success: false,
        serviceName,
        previousReplicas: 0,
        newReplicas: 0,
        timestamp: new Date().toISOString(),
        message,
      }
    }

    // Validate action
    const validation = await validateAction('scale', { serviceName, replicas })
    if (!validation.allowed) {
      logger.warn('Scale action blocked by safety validator', {
        serviceName,
        reason: validation.reason,
      })

      return {
        success: false,
        serviceName,
        previousReplicas: 0,
        newReplicas: 0,
        timestamp: new Date().toISOString(),
        message: `Action blocked: ${validation.reason}`,
      }
    }

    const docker = getDockerClient()

    // For Docker Compose services, we need to use docker-compose scale
    // For now, we'll scale by counting and starting/stopping containers
    const containers = await docker.listContainers({ all: true })
    const serviceContainers = containers.filter((c) =>
      c.Names.some((name) => name.includes(serviceName))
    )

    const previousReplicas = serviceContainers.filter((c) => c.State === 'running').length

    logger.info('Current service state', {
      serviceName,
      previousReplicas,
      targetReplicas: replicas,
    })

    if (replicas > previousReplicas) {
      // Scale up: start stopped containers or create new ones
      const stoppedContainers = serviceContainers.filter((c) => c.State !== 'running')
      const containersToStart = Math.min(replicas - previousReplicas, stoppedContainers.length)
      let startedCount = 0

      for (let i = 0; i < containersToStart; i++) {
        const containerId = stoppedContainers[i].Id
        const container = docker.getContainer(containerId)
        try {
          await container.start()
          startedCount++
          logger.info('Started container', { containerId })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          logger.error('Failed to start container during scale-up', {
            containerId,
            error: errorMessage,
          })
        }
      }

      // If we still need more, we'd need to create new containers
      // For simplicity, we'll just report what we could do
      const actualReplicas = previousReplicas + startedCount

      return {
        success: true,
        serviceName,
        previousReplicas,
        newReplicas: actualReplicas,
        timestamp: new Date().toISOString(),
        message: `Scaled ${serviceName} from ${previousReplicas} to ${actualReplicas} replicas`,
      }
    } else if (replicas < previousReplicas) {
      // Scale down: stop excess containers
      const runningContainers = serviceContainers.filter((c) => c.State === 'running')
      const containersToStop = previousReplicas - replicas
      let stoppedCount = 0

      for (let i = 0; i < containersToStop; i++) {
        const containerId = runningContainers[i].Id
        const container = docker.getContainer(containerId)
        try {
          await container.stop()
          stoppedCount++
          logger.info('Stopped container', { containerId })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          logger.error('Failed to stop container during scale-down', {
            containerId,
            error: errorMessage,
          })
        }
      }

      const actualReplicas = previousReplicas - stoppedCount

      return {
        success: true,
        serviceName,
        previousReplicas,
        newReplicas: actualReplicas,
        timestamp: new Date().toISOString(),
        message: `Scaled ${serviceName} from ${previousReplicas} to ${actualReplicas} replicas`,
      }
    } else {
      // No change needed
      return {
        success: true,
        serviceName,
        previousReplicas,
        newReplicas: replicas,
        timestamp: new Date().toISOString(),
        message: `Service ${serviceName} already at ${replicas} replicas`,
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to scale service', { serviceName, error: errorMessage })

    return {
      success: false,
      serviceName,
      previousReplicas: 0,
      newReplicas: 0,
      timestamp: new Date().toISOString(),
      message: `Failed to scale service: ${errorMessage}`,
    }
  }
}
