import { validateAction } from '../safety/validator.js'
import { SAFETY_LIMITS } from '../safety/limits.js'
import { logger } from '../utils/logger.js'
import { ScaleServiceOutput } from '@runbook/shared-types'
import {
  DEMO_APP_DEPLOYMENT_NAME,
  patchDeploymentScale,
  readDeployment,
} from '../k8s/client.js'

export async function scaleService(
  serviceName: string,
  replicas: number,
  reason?: string
): Promise<ScaleServiceOutput> {
  try {
    logger.info('Attempting to scale service', { serviceName, replicas, reason })

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

    const deploymentName = serviceName || DEMO_APP_DEPLOYMENT_NAME
    const deployment = await readDeployment(deploymentName)
    const previousReplicas = deployment.spec?.replicas ?? 1

    if (previousReplicas === replicas) {
      return {
        success: true,
        serviceName,
        previousReplicas,
        newReplicas: replicas,
        timestamp: new Date().toISOString(),
        message: `Service ${serviceName} already at ${replicas} replicas`,
      }
    }

    await patchDeploymentScale(deploymentName, replicas)

    logger.info('Scaled deployment successfully', {
      deploymentName,
      previousReplicas,
      replicas,
    })

    return {
      success: true,
      serviceName,
      previousReplicas,
      newReplicas: replicas,
      timestamp: new Date().toISOString(),
      message: `Scaled ${serviceName} from ${previousReplicas} to ${replicas} replicas`,
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
