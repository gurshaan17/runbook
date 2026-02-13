import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, Zap } from 'lucide-react'
import { useEffect } from 'react'

interface AgentAction {
  id: string
  timestamp: string
  tool: string
  status: 'pending' | 'running' | 'success' | 'error'
  input: any
  output?: any
  error?: string
}

interface AgentReasoningProps {
  onRunbookActivated: (runbookType: string | null) => void
}

function AgentReasoning({ onRunbookActivated }: AgentReasoningProps) {
  const { data: actions = [] } = useQuery<AgentAction[]>({
    queryKey: ['agent-actions'],
    queryFn: async () => {
      // Mock data - replace with actual Archestra API
      return [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          tool: 'detect-anomaly',
          status: 'success',
          input: { containerId: 'demo-app' },
          output: { anomaly: { type: 'MEMORY_SPIKE' } },
        },
        {
          id: '2',
          timestamp: new Date().toISOString(),
          tool: 'get-runbook',
          status: 'success',
          input: { anomalyType: 'MEMORY_SPIKE' },
          output: { runbook: { name: 'Memory Spike Runbook' } },
        },
      ]
    },
    refetchInterval: 3000,
  })

  useEffect(() => {
    const lastAction = actions[actions.length - 1]
    if (lastAction?.tool === 'get-runbook' && lastAction.status === 'success') {
      onRunbookActivated(lastAction.input.anomalyType)
    }
  }, [actions, onRunbookActivated])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Zap className="w-5 h-5 text-yellow-500 animate-pulse" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="h-[500px] overflow-y-auto space-y-3">
      {actions.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No agent activity yet</p>
        </div>
      ) : (
        actions.map((action) => (
          <div
            key={action.id}
            className="bg-gray-950 rounded-lg border border-gray-800 p-4"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(action.status)}
                <span className="font-medium">{action.tool}</span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(action.timestamp).toLocaleTimeString()}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Input:</span>
                <pre className="mt-1 bg-gray-900 rounded p-2 text-xs overflow-x-auto">
                  {JSON.stringify(action.input, null, 2)}
                </pre>
              </div>
              
              {action.output && (
                <div>
                  <span className="text-gray-500">Output:</span>
                  <pre className="mt-1 bg-gray-900 rounded p-2 text-xs overflow-x-auto">
                    {JSON.stringify(action.output, null, 2)}
                  </pre>
                </div>
              )}
              
              {action.error && (
                <div>
                  <span className="text-red-500">Error:</span>
                  <p className="mt-1 text-red-400 text-xs">{action.error}</p>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

export default AgentReasoning