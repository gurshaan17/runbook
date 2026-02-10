import { ContainerState, LogLevel } from './enums'

export interface ContainerMetrics {
  cpu: number          // Percentage (0-100)
  memory: number       // Percentage (0-100)
  memoryUsage: number  // Bytes
  memoryLimit: number  // Bytes
  network: number      // Bytes/sec
  timestamp: string    // ISO 8601
}

export interface Container {
  id: string
  name: string
  state: ContainerState
  image: string
  stats: ContainerMetrics
  createdAt: string
}

export interface ContainerLog {
  timestamp: string
  level: LogLevel
  message: string
  containerId?: string
  containerName?: string
}

export interface ServiceInfo {
  name: string
  replicas: number
  image: string
  desiredReplicas: number
  labels?: Record<string, string>
}