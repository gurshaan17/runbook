// Safety limits for executor actions
export const SAFETY_LIMITS = {
  // Scaling limits
  MIN_REPLICAS: 1,
  MAX_REPLICAS: 5,

  // Rate limiting
  MAX_ACTIONS_PER_HOUR: 10,
  MAX_RESTARTS_PER_CONTAINER_PER_HOUR: 3,

  // Timing
  MIN_TIME_BETWEEN_ACTIONS_MS: 5000, // 5 seconds
}

// Whitelisted environment variables that can be updated
export const ENV_VAR_WHITELIST = [
  'LOG_LEVEL',
  'DEBUG',
  'NODE_ENV',
  'JAVA_OPTS',
  'MAX_MEMORY',
  'MAX_HEAP_SIZE',
  'TIMEOUT',
  'RETRY_COUNT',
  'POOL_SIZE',
]

// Blocked actions that always require human approval
export const BLOCKED_ACTIONS = [
  'delete',
  'remove',
  'prune',
  'kill',
]