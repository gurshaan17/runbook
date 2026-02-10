// Restart Container
export interface RestartContainerInput {
  containerId: string
  reason?: string
}

export interface RestartContainerOutput {
  success: boolean
  containerId: string
  containerName: string
  previousState: string
  newState: string
  timestamp: string
  message: string
}

// Scale Service
export interface ScaleServiceInput {
  serviceName: string
  /**
   * @minimum 1
   * @maximum 5
   */
  replicas: number
  reason?: string
}

export interface ScaleServiceOutput {
  success: boolean
  serviceName: string
  previousReplicas: number
  newReplicas: number
  timestamp: string
  message: string
}

// Update Environment Variables
export interface UpdateEnvVarsInput {
  containerId: string
  envVars: Record<string, string>
  restart?: boolean    // Restart container after update
  reason?: string
}

export interface UpdateEnvVarsOutput {
  success: boolean
  containerId: string
  updatedVars: string[]
  restarted: boolean
  timestamp: string
  message: string
}

// Rollback Deployment
export interface RollbackDeploymentInput {
  serviceName: string
  reason?: string
}

export interface RollbackDeploymentOutput {
  success: boolean
  serviceName: string
  previousImage: string
  currentImage: string
  timestamp: string
  message: string
}