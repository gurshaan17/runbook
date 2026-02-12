import { logger } from '../utils/logger.js'
import { SAFETY_LIMITS, BLOCKED_ACTIONS } from './limits.js'
import { SafetyCheckResult } from '@runbook/shared-types'
logger
// Track action history for rate limiting
const actionHistory: Array<{
  action: string
  timestamp: number
  target: string
}> = []

export async function validateAction(
  action: string,
  params: Record<string, any>
): Promise<SafetyCheckResult> {
  logger.info('Validating action', { action, params })

  // Check if action is in blocked list
  const isBlocked = BLOCKED_ACTIONS.some((blocked) => action.toLowerCase().includes(blocked))
  if (isBlocked) {
    return {
      allowed: false,
      reason: `Action '${action}' is blocked and requires human approval`,
      suggestions: ['Request manual intervention', 'Use safer alternative action'],
    }
  }

  // Check rate limiting
  const now = Date.now()
  const recentActions = actionHistory.filter(
    (a) => now - a.timestamp < 60 * 60 * 1000 // Last hour
  )

  if (recentActions.length >= SAFETY_LIMITS.MAX_ACTIONS_PER_HOUR) {
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${SAFETY_LIMITS.MAX_ACTIONS_PER_HOUR} actions per hour`,
      suggestions: ['Wait before performing more actions', 'Contact on-call engineer'],
    }
  }

  // Check specific action validations
  if (action === 'restart') {
    const containerId = params.containerId as string
    const containerRestarts = recentActions.filter(
      (a) => a.action === 'restart' && a.target === containerId
    )

    if (containerRestarts.length >= SAFETY_LIMITS.MAX_RESTARTS_PER_CONTAINER_PER_HOUR) {
      return {
        allowed: false,
        reason: `Too many restarts for container ${containerId} in the last hour (${containerRestarts.length}/${SAFETY_LIMITS.MAX_RESTARTS_PER_CONTAINER_PER_HOUR})`,
        suggestions: [
          'Investigate root cause instead of repeatedly restarting',
          'Check logs for persistent issues',
        ],
      }
    }
  }

  // Check minimum time between actions
  if (recentActions.length > 0) {
    const lastAction = recentActions[recentActions.length - 1]
    const timeSinceLastAction = now - lastAction.timestamp

    if (timeSinceLastAction < SAFETY_LIMITS.MIN_TIME_BETWEEN_ACTIONS_MS) {
      return {
        allowed: false,
        reason: `Actions must be spaced at least ${SAFETY_LIMITS.MIN_TIME_BETWEEN_ACTIONS_MS / 1000} seconds apart`,
        suggestions: ['Wait a few seconds before next action'],
      }
    }
  }

  // Log this action
  actionHistory.push({
    action,
    timestamp: now,
    target: params.containerId || params.serviceName || 'unknown',
  })

  // Clean old history (keep last 24 hours)
  while (actionHistory.length > 0 && now - actionHistory[0].timestamp > 24 * 60 * 60 * 1000) {
    actionHistory.shift()
  }

  logger.info('Action validated successfully', { action, params })

  return {
    allowed: true,
    reason: 'Action passed all safety checks',
  }
}

export function getActionHistory() {
  return actionHistory.slice() // Return copy
}

export function clearActionHistory() {
  actionHistory.length = 0
  logger.info('Action history cleared')
}