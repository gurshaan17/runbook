export interface RunbookStep {
  description: string
  action: string
  params: Record<string, unknown>
}

export interface Runbook {
  name: string
  trigger: string
  steps: RunbookStep[]
  rollbackPlan: string
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface ExecutionLog {
  step: RunbookStep
  status: ExecutionStatus
  timestamp: string
  result: string
}
