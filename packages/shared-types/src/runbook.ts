import { ExecutionStatus, AnomalyType } from './enums.js'
import { AnomalyAlert } from './anomaly.js'

export interface RunbookStep {
  stepNumber: number
  description: string
  action: string       // e.g., 'restart', 'scale', 'updateEnv'
  params: Record<string, unknown>
  estimatedDuration?: number  // seconds
  required: boolean
}

export interface Runbook {
  name: string
  description: string
  trigger: AnomalyType
  steps: RunbookStep[]
  rollbackPlan: string
  estimatedTime?: number  // Total estimated seconds
  tags?: string[]
}

export interface ExecutionLog {
  executionId: string
  step: RunbookStep
  status: ExecutionStatus
  startTime: string
  endTime?: string
  result?: string
  error?: string
  retries?: number
}

export interface RunbookExecution {
  id: string
  runbook: Runbook
  anomaly: AnomalyAlert
  logs: ExecutionLog[]
  status: ExecutionStatus
  startTime: string
  endTime?: string
  outcome?: string
}
