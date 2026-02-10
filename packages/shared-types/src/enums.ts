export enum AnomalyType {
  MEMORY_SPIKE = 'MEMORY_SPIKE',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  CPU_OVERLOAD = 'CPU_OVERLOAD',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum ContainerState {
  RUNNING = 'running',
  STOPPED = 'stopped',
  PAUSED = 'paused',
  RESTARTING = 'restarting',
  EXITED = 'exited',
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}