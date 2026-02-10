import { Router, Request, Response } from 'express'
import { register } from 'prom-client'

export const createMetricsRouter = (): Router => {
  const router = Router()

  //@ts-ignore
  router.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', register.contentType)
    res.end(await register.metrics())
  })

  return router
}
