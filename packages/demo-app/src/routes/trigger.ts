import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger'
import { MemoryLeakBug } from '../bugs/memory-leak'
import { ErrorSpamBug } from '../bugs/error-spam'
import { CpuSpikeBug } from '../bugs/cpu-spike'

interface TriggerRouteDeps {
  memoryLeakBug: MemoryLeakBug
  errorSpamBug: ErrorSpamBug
  cpuSpikeBug: CpuSpikeBug
}

export const createTriggerRouter = ({
  memoryLeakBug,
  errorSpamBug,
  cpuSpikeBug,
}: TriggerRouteDeps): Router => {
  const router = Router()

  router.post('/trigger/memory-leak', (req: Request, res: Response) => {
    const action = req.body.action || 'start'

    if (action === 'start') {
      memoryLeakBug.start()
      logger.warn('Memory leak started', {
        currentMemory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
      })
      res.json({
        success: true,
        message: 'Memory leak started - growing at 10MB every 10 seconds',
        currentMemory: process.memoryUsage().heapUsed,
      })
      return
    }

    if (action === 'stop') {
      memoryLeakBug.stop()
      logger.info('Memory leak stopped')
      res.json({
        success: true,
        message: 'Memory leak stopped',
        leakedSize: memoryLeakBug.getLeakedSize(),
      })
      return
    }

    res.status(400).json({
      success: false,
      message: 'Invalid action. Use "start" or "stop"',
    })
  })

  router.post('/trigger/error-spam', (req: Request, res: Response) => {
    const action = req.body.action || 'start'
    const errorRate = req.body.errorRate || 50

    if (action === 'start') {
      errorSpamBug.start(errorRate)
      logger.warn('Error spam started', { errorRate: `${errorRate}%` })
      res.json({
        success: true,
        message: `Error spam started - ${errorRate}% of /api/data requests will fail`,
        errorRate,
      })
      return
    }

    if (action === 'stop') {
      errorSpamBug.stop()
      logger.info('Error spam stopped')
      res.json({
        success: true,
        message: 'Error spam stopped',
        totalErrors: errorSpamBug.getTotalErrors(),
      })
      return
    }

    res.status(400).json({
      success: false,
      message: 'Invalid action. Use "start" or "stop"',
    })
  })

  router.post('/trigger/cpu-spike', (req: Request, res: Response) => {
    const action = req.body.action || 'start'
    const duration = req.body.duration || 30

    if (action === 'start') {
      cpuSpikeBug.start(duration)
      logger.warn('CPU spike started', { duration: `${duration}s` })
      res.json({
        success: true,
        message: `CPU spike started for ${duration} seconds`,
        duration,
      })
      return
    }

    if (action === 'stop') {
      cpuSpikeBug.stop()
      logger.info('CPU spike stopped')
      res.json({
        success: true,
        message: 'CPU spike stopped',
      })
      return
    }

    res.status(400).json({
      success: false,
      message: 'Invalid action. Use "start" or "stop"',
    })
  })

  return router
}
