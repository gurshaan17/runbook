import Docker from 'dockerode'
import { logger } from '../utils/logger'

let dockerClient: Docker | null = null

export function getDockerClient(): Docker {
  if (!dockerClient) {
    logger.info('Initializing Docker client')

    dockerClient = new Docker({
      socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock',
    })
  }

  return dockerClient
}

export async function isDockerAvailable(): Promise<boolean> {
  try {
    const docker = getDockerClient()
    await docker.ping()
    logger.info('Docker daemon is available')
    return true
  } catch (error) {
    logger.error('Docker daemon is not available', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}