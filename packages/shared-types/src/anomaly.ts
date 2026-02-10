export enum AnomalyType {
  MEMORY_SPIKE = 'MEMORY_SPIKE',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  CPU_OVERLOAD = 'CPU_OVERLOAD',
}

export interface Threshold {
  metric: string
  value: number
  duration: number
}

export interface AnomalyAlert {
  type: AnomalyType
  severity: string
  container: string
  metrics: Threshold[]
  timestamp: string
}
