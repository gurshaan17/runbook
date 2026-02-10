import { getDockerClient } from '../docker/watcher.js'
import { ContainerLog, LogLevel } from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

export async function getContainerLogs(
  containerId: string,
  lines: number = 100,
  levelFilter: string = 'ALL'
): Promise<{
  success: boolean
  logs: ContainerLog[]
  totalLines: number
  error?: string
}> {
  try {
    logger.info('Fetching container logs', { containerId, lines, levelFilter })

    const docker = getDockerClient()
    const container = docker.getContainer(containerId)

    // Check if container exists
    try {
      await container.inspect()
    } catch (error) {
      throw new Error(`Container not found: ${containerId}`)
    }

    // Fetch logs
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: true,
      tail: lines,
    })

    // Parse logs
    const logLines = logStream.toString('utf8').split('\n').filter(line => line.trim())
    const parsedLogs: ContainerLog[] = []

    for (const line of logLines) {
      // Remove Docker header (8 bytes)
      const cleanLine = line.slice(8)
      
      // Try to parse structured logs
      const parsed = parseLogLine(cleanLine)
      
      // Apply level filter
      if (levelFilter !== 'ALL' && parsed.level !== levelFilter) {
        continue
      }
      
      parsedLogs.push(parsed)
    }

    logger.info('Logs fetched successfully', {
      containerId,
      totalLines: parsedLogs.length,
    })

    return {
      success: true,
      logs: parsedLogs,
      totalLines: parsedLogs.length,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to fetch logs', { containerId, error: errorMessage })

    return {
      success: false,
      logs: [],
      totalLines: 0,
      error: errorMessage,
    }
  }
}

function parseLogLine(line: string): ContainerLog {
  // Try to extract timestamp (format: 2024-01-15T10:30:45.123Z)
  const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/)
  const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString()

  // Try to detect log level
  let level: LogLevel = LogLevel.INFO
  const upperLine = line.toUpperCase()

  if (upperLine.includes('ERROR') || upperLine.includes('[ERROR]')) {
    level = LogLevel.ERROR
  } else if (upperLine.includes('WARN') || upperLine.includes('[WARN]')) {
    level = LogLevel.WARN
  } else if (upperLine.includes('DEBUG') || upperLine.includes('[DEBUG]')) {
    level = LogLevel.DEBUG
  } else if (upperLine.includes('FATAL') || upperLine.includes('[FATAL]')) {
    level = LogLevel.FATAL
  } else if (upperLine.includes('INFO') || upperLine.includes('[INFO]')) {
    level = LogLevel.INFO
  }

  // Clean message (remove timestamp if present)
  let message = line
  if (timestampMatch) {
    message = line.substring(timestampMatch[0].length).trim()
  }

  return {
    timestamp,
    level,
    message,
  }
}