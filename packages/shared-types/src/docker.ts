export interface ContainerMetrics {
  cpu: number
  memory: number
  network: number
}

export interface Container {
  id: string
  name: string
  state: string
  stats: ContainerMetrics
}

export interface ContainerLog {
  timestamp: string
  level: string
  message: string
}

export interface ServiceInfo {
  name: string
  replicas: number
  image: string
}
