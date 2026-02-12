import { AnomalyType, Severity } from './enums.js'
import { ContainerMetrics } from './docker.js'

export interface Threshold {
  metric: string       // 'cpu' | 'memory' | 'errorRate'
  operator: '>' | '<' | '>=' | '<='
  value: number        // The threshold value
  durationSeconds: number  // How long it must exceed
}

export interface AnomalyAlert {
  type: AnomalyType
  severity: Severity
  containerId: string
  containerName: string
  currentMetrics: ContainerMetrics
  threshold: Threshold
  message: string      // Human-readable description
  timestamp: string
  context?: Record<string, unknown>  // Additional context
}
