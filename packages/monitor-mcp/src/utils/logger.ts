// Simple logger for MCP server (logs to stderr to not interfere with stdio transport)
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    const log = {
      level: 'INFO',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }
    console.error(JSON.stringify(log))
  },

  warn: (message: string, meta?: Record<string, any>) => {
    const log = {
      level: 'WARN',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }
    console.error(JSON.stringify(log))
  },

  error: (message: string, meta?: Record<string, any>) => {
    const log = {
      level: 'ERROR',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }
    console.error(JSON.stringify(log))
  },

  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.DEBUG === 'true') {
      const log = {
        level: 'DEBUG',
        message,
        timestamp: new Date().toISOString(),
        ...meta,
      }
      console.error(JSON.stringify(log))
    }
  },
}