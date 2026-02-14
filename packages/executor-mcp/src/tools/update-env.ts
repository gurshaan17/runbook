import { validateAction } from '../safety/validator.js'
import { ENV_VAR_WHITELIST } from '../safety/limits.js'
import { UpdateEnvVarsOutput } from '@runbook/shared-types'
import { DEMO_APP_DEPLOYMENT_NAME, patchDeployment, readDeployment } from '../k8s/client.js'
import { logger } from '../utils/logger.js'

export async function updateEnvVars(
  containerId: string,
  envVars: Record<string, string>,
  restart: boolean = false,
  reason?: string
): Promise<UpdateEnvVarsOutput> {
  try {
    logger.info('Attempting to update environment variables', {
      containerId,
      envVarKeys: Object.keys(envVars || {}),
      restart,
      reason,
    })

    const invalidVars = Object.keys(envVars).filter((key) => !ENV_VAR_WHITELIST.includes(key))

    if (invalidVars.length > 0) {
      const message = `Blocked: Environment variables not whitelisted: ${invalidVars.join(', ')}. Allowed: ${ENV_VAR_WHITELIST.join(', ')}`
      logger.warn('Update blocked by whitelist', { invalidVars })

      return {
        success: false,
        containerId,
        updatedVars: [],
        restarted: false,
        timestamp: new Date().toISOString(),
        message,
      }
    }

    const validation = await validateAction('update-env', { containerId, envVars })
    if (!validation.allowed) {
      logger.warn('Update action blocked by safety validator', {
        containerId,
        reason: validation.reason,
      })

      return {
        success: false,
        containerId,
        updatedVars: [],
        restarted: false,
        timestamp: new Date().toISOString(),
        message: `Action blocked: ${validation.reason}`,
      }
    }

    const deploymentName = DEMO_APP_DEPLOYMENT_NAME
    const deployment = await readDeployment(deploymentName)
    const containers = deployment.spec?.template?.spec?.containers || []
    const targetContainer = containers[0]

    if (!targetContainer?.name) {
      throw new Error(`Deployment ${deploymentName} has no containers to patch`)
    }

    const currentEnv = targetContainer.env || []
    const currentEnvMap = new Map(currentEnv.map((envVar) => [envVar.name, envVar.value || '']))
    const updatedVars = Object.keys(envVars)

    let hasChanges = false
    for (const [key, value] of Object.entries(envVars)) {
      if ((currentEnvMap.get(key) || '') !== value) {
        hasChanges = true
      }
      currentEnvMap.set(key, value)
    }

    if (!hasChanges && !restart) {
      return {
        success: true,
        containerId,
        updatedVars,
        restarted: false,
        timestamp: new Date().toISOString(),
        message: `No environment changes detected for ${updatedVars.join(', ')}`,
      }
    }

    const mergedEnv = Array.from(currentEnvMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }))

    const templatePatch: Record<string, unknown> = {
      spec: {
        containers: [
          {
            name: targetContainer.name,
            env: mergedEnv,
          },
        ],
      },
    }

    if (restart) {
      templatePatch.metadata = {
        annotations: {
          'kubectl.kubernetes.io/restartedAt': new Date().toISOString(),
        },
      }
    }

    const patch: Record<string, unknown> = {
      spec: {
        template: templatePatch,
      },
    }

    await patchDeployment(deploymentName, patch)

    const restarted = hasChanges || restart

    return {
      success: true,
      containerId,
      updatedVars,
      restarted,
      timestamp: new Date().toISOString(),
      message: restarted
        ? `Updated environment variables (${updatedVars.join(', ')}) and triggered deployment rollout`
        : `Updated environment variables (${updatedVars.join(', ')})`,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to update environment variables', {
      containerId,
      error: errorMessage,
    })

    return {
      success: false,
      containerId,
      updatedVars: [],
      restarted: false,
      timestamp: new Date().toISOString(),
      message: `Failed to update environment variables: ${errorMessage}`,
    }
  }
}
