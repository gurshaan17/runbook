import { logger } from '../utils/logger'

export class MemoryLeakBug {
  private active = false
  private interval: NodeJS.Timeout | null = null
  private leakedData: Array<{ data: Buffer; timestamp: Date }> = []
  private readonly LEAK_SIZE_MB = 10
  private readonly INTERVAL_MS = 10000 // 10 seconds

  start(): void {
    if (this.active) {
      logger.warn('Memory leak already active')
      return
    }

    this.active = true
    this.leakedData = []

    logger.info('Starting memory leak simulation', {
      leakSizeMB: this.LEAK_SIZE_MB,
      intervalMs: this.INTERVAL_MS,
    })

    this.interval = setInterval(() => {
      this.leak()
    }, this.INTERVAL_MS)

    // Immediate first leak
    this.leak()
  }

  stop(): void {
    if (!this.active) {
      logger.warn('Memory leak not active')
      return
    }

    this.active = false

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    const totalLeakedMB = (this.leakedData.length * this.LEAK_SIZE_MB).toFixed(2)
    logger.info('Stopping memory leak simulation', {
      totalLeakedMB,
      iterations: this.leakedData.length,
    })

    // Clear the leaked data
    this.leakedData = []
  }

  isActive(): boolean {
    return this.active
  }

  getLeakedSize(): number {
    return this.leakedData.length * this.LEAK_SIZE_MB
  }

  private leak(): void {
    // Allocate 10MB of data
    const sizeInBytes = this.LEAK_SIZE_MB * 1024 * 1024
    const buffer = Buffer.alloc(sizeInBytes, 'x')

    // Store it so it's not garbage collected
    this.leakedData.push({
      data: buffer,
      timestamp: new Date(),
    })

    const currentMemoryMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    const totalLeakedMB = (this.leakedData.length * this.LEAK_SIZE_MB).toFixed(2)

    logger.warn('Memory leaked', {
      leakedThisIterationMB: this.LEAK_SIZE_MB,
      totalLeakedMB,
      currentHeapUsedMB: currentMemoryMB,
      iterations: this.leakedData.length,
    })
  }
}