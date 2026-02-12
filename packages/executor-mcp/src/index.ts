#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { restartContainer } from './tools/restart.js'
import { scaleService } from './tools/scale.js'
import { updateEnvVars } from './tools/update-env.js'
import { rollbackDeployment } from './tools/rollback.js'
import { logger } from './utils/logger.js'

// Define all available tools
const tools: Tool[] = [
  {
    name: 'restart-container',
    description: 'Restart a Docker container. Used to recover from crashes or apply configuration changes. This is a DESTRUCTIVE action that will briefly interrupt the container.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: 'Docker container ID or name to restart',
        },
        reason: {
          type: 'string',
          description: 'Reason for restarting (for audit log)',
        },
      },
      required: ['containerId'],
    },
  },
  {
    name: 'scale-service',
    description: 'Scale a Docker service to a specific number of replicas. Use to handle increased load or reduce resources. Safety limits: min 1, max 5 replicas.',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: {
          type: 'string',
          description: 'Docker service name (e.g., "demo-app")',
        },
        replicas: {
          type: 'number',
          description: 'Target number of replicas (1-5)',
          minimum: 1,
          maximum: 5,
        },
        reason: {
          type: 'string',
          description: 'Reason for scaling (for audit log)',
        },
      },
      required: ['serviceName', 'replicas'],
    },
  },
  {
    name: 'update-env-vars',
    description: 'Update environment variables for a container. Only whitelisted variables can be updated for security. Container will be restarted if restart=true.',
    inputSchema: {
      type: 'object',
      properties: {
        containerId: {
          type: 'string',
          description: 'Docker container ID or name',
        },
        envVars: {
          type: 'object',
          description: 'Environment variables to update (key-value pairs)',
          additionalProperties: {
            type: 'string',
          },
        },
        restart: {
          type: 'boolean',
          description: 'Whether to restart container after update (default: false)',
          default: false,
        },
        reason: {
          type: 'string',
          description: 'Reason for update (for audit log)',
        },
      },
      required: ['containerId', 'envVars'],
    },
  },
  {
    name: 'rollback-deployment',
    description: 'Rollback a service to its previous Docker image version. Used when a deployment causes issues. This is a DESTRUCTIVE action.',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: {
          type: 'string',
          description: 'Docker service name to rollback',
        },
        reason: {
          type: 'string',
          description: 'Reason for rollback (for audit log)',
        },
      },
      required: ['serviceName'],
    },
  },
]

// Create MCP server
const server = new Server(
  {
    name: 'runbook-executor-mcp',
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

  const sanitizedArgs =
    name === 'update-env-vars' && args && typeof args === 'object'
      ? { ...args, envVars: Object.keys((args as any).envVars ?? {}) }
      : args
  logger.info('Tool called', { tool: name, arguments: sanitizedArgs })

  try {
    switch (name) {
      case 'restart-container': {
        if (!args || typeof args.containerId !== 'string') {
          throw new Error('Missing required argument: containerId')
        }
        const result = await restartContainer(
          args.containerId,
          typeof args.reason === 'string' ? args.reason : undefined
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

      case 'scale-service': {
        if (
          !args ||
          typeof args.serviceName !== 'string' ||
          typeof args.replicas !== 'number' ||
          !Number.isInteger(args.replicas)
        ) {
          throw new Error('Missing required arguments: serviceName, replicas (integer)')
        }
        const result = await scaleService(
          args.serviceName,
          args.replicas,
          typeof args.reason === 'string' ? args.reason : undefined
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

      case 'update-env-vars': {
        if (
          !args ||
          typeof args.containerId !== 'string' ||
          !args.envVars ||
          typeof args.envVars !== 'object' ||
          Array.isArray(args.envVars)
        ) {
          throw new Error('Missing required arguments: containerId, envVars')
        }
        const result = await updateEnvVars(
          args.containerId,
          args.envVars as Record<string, string>,
          typeof args.restart === 'boolean' ? args.restart : undefined,
          typeof args.reason === 'string' ? args.reason : undefined
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

      case 'rollback-deployment': {
        if (!args || typeof args.serviceName !== 'string') {
          throw new Error('Missing required argument: serviceName')
        }
        const result = await rollbackDeployment(
          args.serviceName,
          typeof args.reason === 'string' ? args.reason : undefined
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
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    }
  }
})

// Start server
async function main() {
  logger.info('Starting Executor MCP Server', {
    name: 'runbook-executor-mcp',
    version: '1.0.0',
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)

  logger.info('Executor MCP Server connected and ready')
}

main().catch((error) => {
  logger.error('Fatal error', { error: error.message })
  process.exit(1)
})
