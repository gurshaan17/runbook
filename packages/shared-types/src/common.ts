// Generic tool result wrapper
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

// Safety check result
export interface SafetyCheckResult {
  allowed: boolean
  reason: string
  suggestions?: string[]
}

// Action audit log
export interface ActionAudit {
  actionId: string
  toolName: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  success: boolean
  timestamp: string
  executedBy: string  // 'agent' | 'human'
  durationMs: number
}