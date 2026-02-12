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

    // Parse logs as buffers to avoid corrupting Docker's binary multiplex header.
    const rawLogBuffer = Buffer.isBuffer(logStream)
      ? logStream
      : Buffer.from(
          typeof logStream === 'string' ? logStream : String(logStream),
          'utf8'
        )
    const logLines = splitBufferByNewline(rawLogBuffer).filter(line => line.length > 0)
    const parsedLogs: ContainerLog[] = []

    for (const line of logLines) {
      let payloadBuffer: Buffer
      const hasDockerMuxHeader =
        line.length >= 8 &&
        (line[0] === 0 || line[0] === 1) &&
        line[1] === 0 &&
        line[2] === 0 &&
        line[3] === 0

      if (hasDockerMuxHeader) {
        const payloadLength = line.readUInt32BE(4)
        payloadBuffer =
          payloadLength > 0 && line.length >= 8 + payloadLength
            ? line.slice(8, 8 + payloadLength)
            : line.slice(8)
      } else {
        payloadBuffer = line
      }

      const cleanLine = payloadBuffer.toString('utf8').trim()
      if (!cleanLine) {
        continue
      }
      
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

function splitBufferByNewline(buffer: Buffer): Buffer[] {
  const lines: Buffer[] = []
  let start = 0

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0x0a) {
      lines.push(buffer.slice(start, i))
      start = i + 1
    }
  }

  if (start < buffer.length) {
    lines.push(buffer.slice(start))
  }

  return lines
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
