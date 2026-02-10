import { ContainerLog, ContainerMetrics } from './docker'
import { AnomalyAlert } from './anomaly'
import { Runbook } from './runbook'

// List Containers
export interface ListContainersInput {
  all?: boolean
  filters?: Record<string, string>
}

export interface ListContainersOutput {
  containers: Array<{
    id: string
    name: string
    state: string
    image: string
  }>
}

// Get Container Stats
export interface GetContainerStatsInput {
  containerId: string
}

export interface GetContainerStatsOutput {
  metrics: ContainerMetrics
}

// Get Container Logs
export interface GetContainerLogsInput {
  containerId: string
  tail?: number        // Number of lines (default: 100)
  since?: string       // Timestamp
  level?: string       // Filter by log level
}

export interface GetContainerLogsOutput {
  logs: ContainerLog[]
  totalLines: number
}

// Detect Anomaly
export interface DetectAnomalyInput {
  containerId: string
}

export interface DetectAnomalyOutput {
  anomaly: AnomalyAlert | null
  checksPerformed: string[]
  timestamp: string
}

// Get Runbook
export interface GetRunbookInput {
  anomalyType: string  // AnomalyType as string for MCP
}

export interface GetRunbookOutput {
  runbook: Runbook
  source: string       // File path
  content: string      // Raw markdown
}