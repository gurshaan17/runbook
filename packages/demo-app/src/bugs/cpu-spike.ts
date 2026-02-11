import { logger } from '../utils/logger.js'

export class CpuSpikeBug {
  private active = false
  private timeout: NodeJS.Timeout | null = null
  private workers: NodeJS.Timeout[] = []
  private readonly WORKER_COUNT = 4 // Number of CPU-intensive loops

  start(durationSeconds: number = 30): void {
    if (this.active) {
      logger.warn('CPU spike already active')
      return
    }

    this.active = true

    logger.info('Starting CPU spike simulation', {
      durationSeconds,
      workerCount: this.WORKER_COUNT,
    })

    // Start multiple CPU-intensive workers
    for (let i = 0; i < this.WORKER_COUNT; i++) {
      const worker = setInterval(() => {
        this.burnCpu()
      }, 10) // Run every 10ms

      this.workers.push(worker)
    }

    // Auto-stop after duration
    this.timeout = setTimeout(() => {
      logger.info('CPU spike duration reached, stopping')
      this.stop()
    }, durationSeconds * 1000)
  }

  stop(): void {
    if (!this.active) {
      logger.warn('CPU spike not active')
      return
    }

    this.active = false

    // Clear all workers
    this.workers.forEach(worker => clearInterval(worker))
    this.workers = []

    // Clear timeout
    if (this.timeout) {
      clearTimeout(this.timeout)
      this.timeout = null
    }

    logger.info('Stopping CPU spike simulation')
  }

  isActive(): boolean {
    return this.active
  }

  private burnCpu(): void {
    // CPU-intensive calculation
    const iterations = 1000000
    let result = 0

    for (let i = 0; i < iterations; i++) {
      // Heavy math operations
      result += Math.sqrt(i) * Math.sin(i) * Math.cos(i)
      result = result % 1000000 // Keep number reasonable
    }

    // Prevent optimization
    if (result > 0) {
      // This will never log but prevents V8 from optimizing away the loop
      if (result === -1) {
        logger.debug('CPU burn result', { result })
      }
    }
  }
}