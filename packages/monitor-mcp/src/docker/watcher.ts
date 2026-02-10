import Docker from 'dockerode'
import { logger } from '../utils/logger.js'

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

export async function listContainers(all: boolean = false) {
  try {
    const docker = getDockerClient()
    const containers = await docker.listContainers({ all })
    
    logger.info('Listed containers', { count: containers.length })
    
    return containers.map(container => ({
      id: container.Id,
      name: container.Names[0]?.replace(/^\//, '') || 'unknown',
      state: container.State,
      image: container.Image,
    }))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to list containers', { error: errorMessage })
    throw error
  }
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