import { getContainerMetrics } from './get-metrics.js'
import { getContainerLogs } from './get-logs.js'
import { 
  AnomalyAlert, 
  AnomalyType, 
  Severity, 
  Threshold 
} from '@runbook/shared-types'
import { logger } from '../utils/logger.js'

// Thresholds for anomaly detection
const THRESHOLDS = {
  MEMORY_PERCENT: 80,
  CPU_PERCENT: 90,
  ERROR_RATE_PERCENT: 5,
}

export async function detectAnomaly(
  containerId: string
): Promise<{
  success: boolean
  anomaly: AnomalyAlert | null
  checksPerformed: string[]
  timestamp: string
  error?: string
}> {
  try {
    logger.info('Detecting anomalies', { containerId })

    const checksPerformed: string[] = []
    const timestamp = new Date().toISOString()

    // Get container metrics
    const metricsResult = await getContainerMetrics(containerId)
    if (!metricsResult.success || !metricsResult.metrics) {
      throw new Error('Failed to fetch container metrics')
    }

    const { metrics, containerName } = metricsResult
    checksPerformed.push('metrics')

    // Check for memory spike
    if (metrics.memory > THRESHOLDS.MEMORY_PERCENT) {
      logger.warn('Memory spike detected', {
        containerId,
        memoryPercent: metrics.memory,
        threshold: THRESHOLDS.MEMORY_PERCENT,
      })

      const threshold: Threshold = {
        metric: 'memory',
        operator: '>',
        value: THRESHOLDS.MEMORY_PERCENT,
        durationSeconds: 120,
      }

      const anomaly: AnomalyAlert = {
        type: AnomalyType.MEMORY_SPIKE,
        severity: metrics.memory > 90 ? Severity.CRITICAL : Severity.HIGH,
        containerId,
        containerName: containerName || containerId,
        currentMetrics: metrics,
        threshold,
        message: `Memory usage at ${metrics.memory.toFixed(2)}% exceeds threshold of ${THRESHOLDS.MEMORY_PERCENT}%`,
        timestamp,
      }

      return {
        success: true,
        anomaly,
        checksPerformed,
        timestamp,
      }
    }

    // Check for CPU overload
    if (metrics.cpu > THRESHOLDS.CPU_PERCENT) {
      logger.warn('CPU overload detected', {
        containerId,
        cpuPercent: metrics.cpu,
        threshold: THRESHOLDS.CPU_PERCENT,
      })

      const threshold: Threshold = {
        metric: 'cpu',
        operator: '>',
        value: THRESHOLDS.CPU_PERCENT,
        durationSeconds: 120,
      }

      const anomaly: AnomalyAlert = {
        type: AnomalyType.CPU_OVERLOAD,
        severity: metrics.cpu > 95 ? Severity.CRITICAL : Severity.HIGH,
        containerId,
        containerName: containerName || containerId,
        currentMetrics: metrics,
        threshold,
        message: `CPU usage at ${metrics.cpu.toFixed(2)}% exceeds threshold of ${THRESHOLDS.CPU_PERCENT}%`,
        timestamp,
      }

      return {
        success: true,
        anomaly,
        checksPerformed,
        timestamp,
      }
    }

    // Check for high error rate
    const logsResult = await getContainerLogs(containerId, 100, 'ERROR')
    const totalLogsResult = await getContainerLogs(containerId, 100)
    checksPerformed.push('error-logs')

    if (logsResult.success && totalLogsResult.success) {
      const errorCount = logsResult.logs.length
      const totalLogsFetched = totalLogsResult.logs.length

      if (totalLogsFetched === 0) {
        logger.info('Skipped error-rate check due to empty log window', {
          containerId,
        })
      } else {
        const errorRate = (errorCount / totalLogsFetched) * 100

        if (errorRate > THRESHOLDS.ERROR_RATE_PERCENT) {
          logger.warn('High error rate detected', {
            containerId,
            errorRate,
            threshold: THRESHOLDS.ERROR_RATE_PERCENT,
          })

          const threshold: Threshold = {
            metric: 'errorRate',
            operator: '>',
            value: THRESHOLDS.ERROR_RATE_PERCENT,
            durationSeconds: 60,
          }

          const anomaly: AnomalyAlert = {
            type: AnomalyType.HIGH_ERROR_RATE,
            severity: errorRate > 20 ? Severity.CRITICAL : Severity.HIGH,
            containerId,
            containerName: containerName || containerId,
            currentMetrics: metrics,
            threshold,
            message: `Error rate at ${errorRate.toFixed(2)}% exceeds threshold of ${THRESHOLDS.ERROR_RATE_PERCENT}%`,
            timestamp,
            context: {
              errorCount,
              totalLogs: totalLogsFetched,
              recentErrors: logsResult.logs.slice(0, 5).map(log => log.message),
            },
          }

          return {
            success: true,
            anomaly,
            checksPerformed,
            timestamp,
          }
        }
      }
    }

    // No anomalies detected
    logger.info('No anomalies detected', {
      containerId,
      memory: metrics.memory,
      cpu: metrics.cpu,
    })

    return {
      success: true,
      anomaly: null,
      checksPerformed,
      timestamp,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to detect anomaly', { containerId, error: errorMessage })

    return {
      success: false,
      anomaly: null,
      checksPerformed: [],
      timestamp: new Date().toISOString(),
      error: errorMessage,
    }
  }
}
