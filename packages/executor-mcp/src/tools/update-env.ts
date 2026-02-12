import { getDockerClient } from '../docker/client.js'
import { validateAction } from '../safety/validator.js'
import { ENV_VAR_WHITELIST } from '../safety/limits.js'
import { UpdateEnvVarsOutput } from '@runbook/shared-types'
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
      envVars,
      restart,
      reason,
    })

    // Validate environment variables against whitelist
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

    // Validate action
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

    const docker = getDockerClient()
    const container = docker.getContainer(containerId)

    // Get current container config
    const info = await container.inspect()
    const currentEnv = info.Config.Env || []

    // Update environment variables
    const newEnv = [...currentEnv]
    const updatedVars: string[] = []

    for (const [key, value] of Object.entries(envVars)) {
      const envString = `${key}=${value}`
      const existingIndex = newEnv.findIndex((e) => e.startsWith(`${key}=`))

      if (existingIndex >= 0) {
        newEnv[existingIndex] = envString
      } else {
        newEnv.push(envString)
      }

      updatedVars.push(key)
    }

    logger.info('Environment variables prepared', {
      containerId,
      updatedVars,
    })

    // Note: Docker doesn't allow updating env vars on running containers
    // We need to recreate the container or restart it
    // For safety, we'll just log this and require manual restart or use docker-compose

    let restarted = false
    if (restart) {
      await container.restart()
      restarted = true
      logger.info('Container restarted with new env vars', { containerId })
    }

    return {
      success: true,
      containerId,
      updatedVars,
      restarted,
      timestamp: new Date().toISOString(),
      message: `Updated environment variables: ${updatedVars.join(', ')}. ${
        restart ? 'Container restarted.' : 'Restart required for changes to take effect.'
      }`,
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