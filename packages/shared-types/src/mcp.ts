export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  timestamp: string
}

export interface DockerListContainersInput {
  all?: boolean
}

export interface DockerContainerSummary {
  id: string
  name: string
  state: string
}

export type DockerListContainersOutput = DockerContainerSummary[]

export interface DockerGetContainerStatsInput {
  containerId: string
}

export interface DockerGetContainerStatsOutput {
  cpu: number
  memory: number
  network: number
}

export interface DockerGetContainerLogsInput {
  containerId: string
  tail?: number
}

export interface DockerContainerLogEntry {
  timestamp: string
  level: string
  message: string
}

export type DockerGetContainerLogsOutput = DockerContainerLogEntry[]

export interface RunbookExecuteInput {
  name: string
  params?: Record<string, unknown>
}

export interface RunbookExecuteOutput {
  executionId: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
}
