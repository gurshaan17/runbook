import { getDockerClient } from '../docker/watcher.js'
import { ContainerMetrics, ContainerState } from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

export async function getContainerMetrics(
  containerId: string
): Promise<{
  success: boolean
  metrics?: ContainerMetrics
  containerName?: string
  state?: ContainerState
  error?: string
}> {
  try {
    logger.info('Fetching container metrics', { containerId })

    const docker = getDockerClient()
    const container = docker.getContainer(containerId)

    // Get container info
    const info = await container.inspect()
    const containerName = info.Name.replace(/^\//, '') // Remove leading slash

    // Check if container is running
    if (!info.State.Running) {
      return {
        success: true,
        containerName,
        state: info.State.Status as ContainerState,
        metrics: {
          cpu: 0,
          memory: 0,
          memoryUsage: 0,
          memoryLimit: 0,
          network: 0,
          timestamp: new Date().toISOString(),
        },
      }
    }

    // Get stats
    const stats = await container.stats({ stream: false })

    // Calculate CPU percentage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     (stats.precpu_stats.cpu_usage?.total_usage || 0)
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        (stats.precpu_stats.system_cpu_usage || 0)
    const numberOfCores = stats.cpu_stats.online_cpus || 1
    
    let cpuPercent = 0
    if (systemDelta > 0 && cpuDelta > 0) {
      cpuPercent = (cpuDelta / systemDelta) * numberOfCores * 100
    }

    // Calculate memory percentage
    const memoryUsage = stats.memory_stats.usage || 0
    const memoryLimit = stats.memory_stats.limit || 1
    const memoryPercent = (memoryUsage / memoryLimit) * 100

    // Calculate network I/O
    let networkBytes = 0
    if (stats.networks) {
      for (const network of Object.values(stats.networks)) {
        networkBytes += (network as any).rx_bytes + (network as any).tx_bytes
      }
    }

    const metrics: ContainerMetrics = {
      cpu: parseFloat(cpuPercent.toFixed(2)),
      memory: parseFloat(memoryPercent.toFixed(2)),
      memoryUsage,
      memoryLimit,
      network: networkBytes,
      timestamp: new Date().toISOString(),
    }

    logger.info('Metrics fetched successfully', {
      containerId,
      containerName,
      cpu: metrics.cpu,
      memory: metrics.memory,
    })

    return {
      success: true,
      metrics,
      containerName,
      state: ContainerState.RUNNING,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch metrics', { containerId, error: errorMessage })

    return {
      success: false,
      error: errorMessage,
    }
  }
}