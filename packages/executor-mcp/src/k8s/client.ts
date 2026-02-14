import {
  AppsV1Api,
  CoreV1Api,
  KubeConfig,
  V1Deployment,
  V1Pod,
  V1ReplicaSet,
} from '@kubernetes/client-node'
import { logger } from '../utils/logger.js'

export const DEFAULT_NAMESPACE = process.env.K8S_NAMESPACE || 'default'
export const DEMO_APP_LABEL_SELECTOR = process.env.DEMO_APP_LABEL_SELECTOR || 'app=demo-app'
export const DEMO_APP_DEPLOYMENT_NAME = process.env.DEMO_APP_DEPLOYMENT_NAME || 'demo-app'

const kubeConfig = new KubeConfig()

try {
  kubeConfig.loadFromCluster()
  logger.info('Initialized Kubernetes client from in-cluster service account')
} catch (error) {
  logger.warn('Failed to load in-cluster Kubernetes config, falling back to default kubeconfig', {
    error: error instanceof Error ? error.message : 'Unknown error',
  })
  kubeConfig.loadFromDefault()
}

export const coreApi = kubeConfig.makeApiClient(CoreV1Api)
export const appsApi = kubeConfig.makeApiClient(AppsV1Api)

export async function listDemoAppPods(): Promise<V1Pod[]> {
  const api = coreApi as any

  try {
    const response = await api.listNamespacedPod({
      namespace: DEFAULT_NAMESPACE,
      labelSelector: DEMO_APP_LABEL_SELECTOR,
    })
    return extractItems<V1Pod>(response)
  } catch {
    const response = await api.listNamespacedPod(
      DEFAULT_NAMESPACE,
      undefined,
      undefined,
      undefined,
      undefined,
      DEMO_APP_LABEL_SELECTOR
    )
    return extractItems<V1Pod>(response)
  }
}

export async function deleteDemoAppPods(fieldSelector?: string): Promise<void> {
  const api = coreApi as any

  try {
    await api.deleteCollectionNamespacedPod({
      namespace: DEFAULT_NAMESPACE,
      labelSelector: DEMO_APP_LABEL_SELECTOR,
      fieldSelector,
    })
    return
  } catch {
    await api.deleteCollectionNamespacedPod(
      DEFAULT_NAMESPACE,
      undefined,
      undefined,
      undefined,
      undefined,
      fieldSelector,
      DEMO_APP_LABEL_SELECTOR
    )
  }
}

export async function readDeployment(name: string): Promise<V1Deployment> {
  const api = appsApi as any

  try {
    const response = await api.readNamespacedDeployment({
      name,
      namespace: DEFAULT_NAMESPACE,
    })
    return extractBody<V1Deployment>(response)
  } catch {
    const response = await api.readNamespacedDeployment(name, DEFAULT_NAMESPACE)
    return extractBody<V1Deployment>(response)
  }
}

export async function patchDeployment(name: string, patch: Record<string, unknown>): Promise<void> {
  const api = appsApi as any

  try {
    await api.patchNamespacedDeployment({
      name,
      namespace: DEFAULT_NAMESPACE,
      body: patch,
      headers: {
        'Content-Type': 'application/strategic-merge-patch+json',
      },
    })
    return
  } catch {
    await api.patchNamespacedDeployment(
      name,
      DEFAULT_NAMESPACE,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/strategic-merge-patch+json',
        },
      }
    )
  }
}

export async function patchDeploymentScale(name: string, replicas: number): Promise<void> {
  const api = appsApi as any
  const patch = {
    spec: {
      replicas,
    },
  }

  try {
    await api.patchNamespacedDeploymentScale({
      name,
      namespace: DEFAULT_NAMESPACE,
      body: patch,
      headers: {
        'Content-Type': 'application/merge-patch+json',
      },
    })
    return
  } catch {
    await api.patchNamespacedDeploymentScale(
      name,
      DEFAULT_NAMESPACE,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      {
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
      }
    )
  }
}

export async function listDemoAppReplicaSets(): Promise<V1ReplicaSet[]> {
  const api = appsApi as any

  try {
    const response = await api.listNamespacedReplicaSet({
      namespace: DEFAULT_NAMESPACE,
      labelSelector: DEMO_APP_LABEL_SELECTOR,
    })
    return extractItems<V1ReplicaSet>(response)
  } catch {
    const response = await api.listNamespacedReplicaSet(
      DEFAULT_NAMESPACE,
      undefined,
      undefined,
      undefined,
      undefined,
      DEMO_APP_LABEL_SELECTOR
    )
    return extractItems<V1ReplicaSet>(response)
  }
}

function extractItems<T>(response: unknown): T[] {
  if (response && typeof response === 'object') {
    const maybeItems = (response as { items?: T[] }).items
    if (Array.isArray(maybeItems)) {
      return maybeItems
    }

    const bodyItems = (response as { body?: { items?: T[] } }).body?.items
    if (Array.isArray(bodyItems)) {
      return bodyItems
    }
  }

  return []
}

function extractBody<T>(response: unknown): T {
  if (response && typeof response === 'object') {
    const body = (response as { body?: T }).body
    if (body) {
      return body
    }
  }

  return response as T
}
