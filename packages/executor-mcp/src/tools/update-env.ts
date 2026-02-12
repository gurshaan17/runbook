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

    let restarted = false
    if (restart) {
      const containerName = info.Name?.replace(/^\//, '') || undefined

      try {
        const createOptions = {
          Image: info.Config.Image,
          Cmd: info.Config.Cmd,
          Entrypoint: info.Config.Entrypoint,
          Env: newEnv,
          WorkingDir: info.Config.WorkingDir,
          User: info.Config.User,
          Labels: info.Config.Labels,
          ExposedPorts: info.Config.ExposedPorts,
          HostConfig: info.HostConfig,
        }

        if (info.State?.Running) {
          await container.stop({ t: 10 })
        }
        await container.remove()

        const newContainer = await docker.createContainer(
          containerName ? { ...createOptions, name: containerName } : createOptions
        )
        await newContainer.start()

        restarted = true
        const newContainerId = newContainer.id
        logger.info('Container replaced to apply env vars', {
          previousContainerId: containerId,
          newContainerId,
          containerName,
          updatedVars,
        })

        return {
          success: true,
          containerId: newContainerId,
          updatedVars,
          restarted,
          timestamp: new Date().toISOString(),
          message: `Updated environment variables: ${updatedVars.join(', ')}. Recreated container to apply changes.`,
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error('Failed to recreate container for env update', {
          containerId,
          error: errorMessage,
          updatedVars,
        })

        return {
          success: false,
          containerId,
          updatedVars,
          restarted: false,
          timestamp: new Date().toISOString(),
          message: `Environment variables prepared (${updatedVars.join(', ')}) but not applied. Automatic recreation failed: ${errorMessage}. Manual container recreation/restart is required.`,
        }
      }
    }

    return {
      success: true,
      containerId,
      updatedVars,
      restarted,
      timestamp: new Date().toISOString(),
      message: `Environment variables prepared (${updatedVars.join(', ')}), but not applied yet. Re-run with restart=true or manually recreate/restart the container.`,
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
