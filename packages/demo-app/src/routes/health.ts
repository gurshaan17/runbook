import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger.js'
import { MemoryLeakBug } from '../bugs/memory-leak'
import { ErrorSpamBug } from '../bugs/error-spam'
import { CpuSpikeBug } from '../bugs/cpu-spike'

interface HealthRouteDeps {
  memoryLeakBug: MemoryLeakBug
  errorSpamBug: ErrorSpamBug
  cpuSpikeBug: CpuSpikeBug
}

export const createHealthRouter = ({
  memoryLeakBug,
  errorSpamBug,
  cpuSpikeBug,
}: HealthRouteDeps): Router => {
  const router = Router()

  //@ts-ignore
  router.get('/health', (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        external: `${(process.memoryUsage().external / 1024 / 1024).toFixed(2)} MB`,
      },
      bugs: {
        memoryLeak: memoryLeakBug.isActive(),
        errorSpam: errorSpamBug.isActive(),
        cpuSpike: cpuSpikeBug.isActive(),
      },
    }

    logger.info('Health check requested', health)
    res.json(health)
  })

  return router
}
