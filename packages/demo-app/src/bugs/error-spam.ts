import { logger } from '../utils/logger.js'

export class ErrorSpamBug {
  private active = false
  private errorRate = 50 // percentage (0-100)
  private totalErrors = 0
  private totalRequests = 0

  start(errorRate: number = 50): void {
    if (this.active) {
      logger.warn('Error spam already active')
      return
    }

    // Validate error rate
    if (errorRate < 0 || errorRate > 100) {
      logger.error('Invalid error rate', { errorRate })
      throw new Error('Error rate must be between 0 and 100')
    }

    this.active = true
    this.errorRate = errorRate
    this.totalErrors = 0
    this.totalRequests = 0

    logger.info('Starting error spam simulation', {
      errorRate: `${errorRate}%`,
    })
  }

  stop(): void {
    if (!this.active) {
      logger.warn('Error spam not active')
      return
    }

    this.active = false

    const actualErrorRate = this.totalRequests > 0
      ? ((this.totalErrors / this.totalRequests) * 100).toFixed(2)
      : 0

    logger.info('Stopping error spam simulation', {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      actualErrorRate: `${actualErrorRate}%`,
      configuredErrorRate: `${this.errorRate}%`,
    })
  }

  isActive(): boolean {
    return this.active
  }

  shouldError(): boolean {
    if (!this.active) {
      return false
    }

    this.totalRequests++

    // Random chance based on error rate
    const shouldFail = Math.random() * 100 < this.errorRate

    if (shouldFail) {
      this.totalErrors++
    }

    return shouldFail
  }

  getTotalErrors(): number {
    return this.totalErrors
  }

  getCurrentErrorRate(): number {
    if (this.totalRequests === 0) {
      return 0
    }
    return (this.totalErrors / this.totalRequests) * 100
  }

  getStats() {
    return {
      active: this.active,
      configuredErrorRate: this.errorRate,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      actualErrorRate: this.getCurrentErrorRate(),
    }
  }
}