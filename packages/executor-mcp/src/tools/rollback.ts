import { validateAction } from '../safety/validator.js'
import { RollbackDeploymentOutput } from '@runbook/shared-types'
import {
  DEMO_APP_DEPLOYMENT_NAME,
  listDemoAppReplicaSets,
  patchDeployment,
  readDeployment,
} from '../k8s/client.js'
import { logger } from '../utils/logger.js'

export async function rollbackDeployment(
  serviceName: string,
  reason?: string
): Promise<RollbackDeploymentOutput> {
  try {
    logger.info('Attempting to rollback deployment', { serviceName, reason })

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

    const deploymentName = serviceName || DEMO_APP_DEPLOYMENT_NAME
    const deployment = await readDeployment(deploymentName)
    const currentContainer = deployment.spec?.template?.spec?.containers?.[0]

    if (!currentContainer?.name || !currentContainer.image) {
      throw new Error(`Deployment ${deploymentName} does not contain a rollback target image`)
    }

    const imageBeforeRollback = currentContainer.image
    const replicaSets = await listDemoAppReplicaSets()
    const ownedReplicaSets = replicaSets
      .filter((replicaSet) =>
        (replicaSet.metadata?.ownerReferences || []).some(
          (owner) => owner.kind === 'Deployment' && owner.name === deploymentName
        )
      )
      .map((replicaSet) => {
        const revision = Number.parseInt(
          replicaSet.metadata?.annotations?.['deployment.kubernetes.io/revision'] || '0',
          10
        )
        const image = replicaSet.spec?.template?.spec?.containers?.[0]?.image || ''

        return {
          revision: Number.isFinite(revision) ? revision : 0,
          image,
        }
      })
      .sort((a, b) => b.revision - a.revision)

    const rollbackTarget = ownedReplicaSets.find(
      (candidate) => candidate.image && candidate.image !== imageBeforeRollback
    )

    if (!rollbackTarget?.image) {
      return {
        success: false,
        serviceName,
        previousImage: imageBeforeRollback,
        currentImage: imageBeforeRollback,
        timestamp: new Date().toISOString(),
        message:
          'No previous deployment revision image found to rollback to. Ensure at least one prior rollout exists.',
      }
    }

    await patchDeployment(deploymentName, {
      spec: {
        template: {
          spec: {
            containers: [
              {
                name: currentContainer.name,
                image: rollbackTarget.image,
              },
            ],
          },
        },
      },
    })

    logger.info('Deployment rolled back successfully', {
      deploymentName,
      fromImage: imageBeforeRollback,
      toImage: rollbackTarget.image,
    })

    return {
      success: true,
      serviceName,
      previousImage: imageBeforeRollback,
      currentImage: rollbackTarget.image,
      timestamp: new Date().toISOString(),
      message: `Rolled back ${serviceName} from ${imageBeforeRollback} to ${rollbackTarget.image}`,
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
