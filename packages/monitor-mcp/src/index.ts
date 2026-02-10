#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { getContainerLogs } from './tools/get-logs.js'
import { getContainerMetrics } from './tools/get-metrics.js'
import { detectAnomaly } from './tools/detect-anomaly.js'
import { getRunbook } from './tools/get-runbook.js'
import { logger } from './utils/logger.js'

// Define all available tools
const tools: Tool[] = [
  {
    name: 'get-container-logs',
    description: 'Fetch recent logs from a Docker container. Useful for investigating errors and understanding application behavior.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: 'Docker container ID or name',
        },
        lines: {
          type: 'number',
          description: 'Number of log lines to retrieve (default: 100)',
          default: 100,
        },
        level: {
          type: 'string',
          description: 'Filter by log level (ERROR, WARN, INFO, DEBUG)',
          enum: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'ALL'],
          default: 'ALL',
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'get-container-metrics',
    description: 'Get current CPU, memory, and network metrics for a Docker container. Essential for monitoring resource usage.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: 'Docker container ID or name',
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'detect-anomaly',
    description: 'Analyze container metrics and detect anomalies (memory spikes, high error rates, CPU overload). Returns alert if thresholds are exceeded.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: 'Docker container ID or name',
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'get-runbook',
    description: 'Retrieve the appropriate runbook (step-by-step remediation guide) for a specific anomaly type.',
    inputSchema: {
      type: 'object',
      properties: {
        anomalyType: {
          type: 'string',
          description: 'Type of anomaly',
          enum: ['MEMORY_SPIKE', 'HIGH_ERROR_RATE', 'CPU_OVERLOAD'],
        },
      },
      required: ['anomalyType'],
    },
  },
]

// Create MCP server
const server = new Server(
  {
    name: 'runbook-monitor-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  logger.info('Tools list requested')
  return { tools }
})

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  logger.info('Tool called', { tool: name, arguments: args })

  try {
    switch (name) {
      case 'get-container-logs': {
        const result = await getContainerLogs(
          args.containerId as string,
          args.lines as number | undefined,
          args.level as string | undefined
        )
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'get-container-metrics': {
        const result = await getContainerMetrics(args.containerId as string)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'detect-anomaly': {
        const result = await detectAnomaly(args.containerId as string)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      case 'get-runbook': {
        const result = await getRunbook(args.anomalyType as string)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      }

      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Tool execution failed', { tool: name, error: errorMessage })
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: errorMessage,
          }, null, 2),
        },
      ],
      isError: true,
    }
  }
})

// Start server
async function main() {
  logger.info('Starting Monitor MCP Server', {
    name: 'runbook-monitor-mcp',
    version: '1.0.0',
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  logger.info('Monitor MCP Server connected and ready')
}

main().catch((error) => {
  logger.error('Fatal error', { error: error.message })
  process.exit(1)
})