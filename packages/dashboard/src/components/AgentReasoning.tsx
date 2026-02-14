import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, Clock, Zap, Activity } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AgentAction {
    id: string
    timestamp: string
    tool: string
    status: 'pending' | 'running' | 'success' | 'error'
    input: Record<string, unknown>
    output?: Record<string, unknown>
    error?: string
}

interface AgentReasoningProps {
    onRunbookActivated: (runbookType: string | null) => void
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
})

function AgentReasoning({ onRunbookActivated }: AgentReasoningProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const { data: actions = [] } = useQuery<AgentAction[]>({
        queryKey: ['agent-actions'],
        queryFn: async () => {
            return [
                {
                    id: '1',
                    timestamp: new Date().toISOString(),
                    tool: 'detect-anomaly',
                    status: 'success' as const,
                    input: { containerId: 'demo-app' },
                    output: { anomaly: { type: 'MEMORY_SPIKE' } },
                },
                {
                    id: '2',
                    timestamp: new Date().toISOString(),
                    tool: 'get-runbook',
                    status: 'success' as const,
                    input: { anomalyType: 'MEMORY_SPIKE' },
                    output: { runbook: { name: 'Memory Spike Runbook' } },
                },
                {
                    id: '3',
                    timestamp: new Date().toISOString(),
                    tool: 'execute-step',
                    status: 'running' as const,
                    input: { step: 'restart-container', target: 'demo-app' },
                },
            ]
        },
        refetchInterval: 3000,
    })

    useEffect(() => {
        const lastAction = actions[actions.length - 1]
        if (lastAction?.tool === 'get-runbook' && lastAction.status === 'success') {
            onRunbookActivated((lastAction.input as { anomalyType?: string }).anomalyType ?? null)
        }
    }, [actions, onRunbookActivated])

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'success':
                return {
                    icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
                    color: '#10b981',
                    bg: 'rgba(16, 185, 129, 0.1)',
                    border: 'rgba(16, 185, 129, 0.2)',
                    label: 'Success',
                }
            case 'error':
                return {
                    icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
                    color: '#ef4444',
                    bg: 'rgba(239, 68, 68, 0.1)',
                    border: 'rgba(239, 68, 68, 0.2)',
                    label: 'Error',
                }
            case 'running':
                return {
                    icon: <Zap className="w-4 h-4 animate-pulse" aria-hidden="true" />,
                    color: '#f59e0b',
                    bg: 'rgba(245, 158, 11, 0.1)',
                    border: 'rgba(245, 158, 11, 0.2)',
                    label: 'Running',
                }
            default:
                return {
                    icon: <Clock className="w-4 h-4" aria-hidden="true" />,
                    color: '#64748b',
                    bg: 'rgba(100, 116, 139, 0.1)',
                    border: 'rgba(100, 116, 139, 0.2)',
                    label: 'Pending',
                }
        }
    }

    return (
        <div className="h-[460px] overflow-y-auto" role="feed" aria-label="Agent activity feed">
            {actions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Activity className="w-8 h-8 animate-pulse-glow" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        No agent activity yet…
                    </p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline line */}
                    <div
                        className="absolute left-[15px] top-2 bottom-2 w-px"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                        aria-hidden="true"
                    />

                    <div className="space-y-3">
                        {actions.map((action, index) => {
                            const config = getStatusConfig(action.status)
                            const isExpanded = expandedId === action.id

                            return (
                                <div
                                    key={action.id}
                                    className="relative pl-9 animate-slide-in"
                                    style={{ animationDelay: `${index * 80}ms` }}
                                    role="article"
                                    aria-label={`${action.tool} — ${config.label}`}
                                >
                                    {/* Timeline dot */}
                                    <div
                                        className="absolute left-[9px] top-3 w-3 h-3 rounded-full border-2"
                                        style={{
                                            borderColor: config.color,
                                            background: config.bg,
                                            boxShadow: `0 0 8px ${config.border}`,
                                        }}
                                        aria-hidden="true"
                                    />

                                    <div
                                        className="rounded-lg p-3.5 transition-colors cursor-pointer"
                                        style={{
                                            background: 'rgba(17, 24, 39, 0.4)',
                                            border: `1px solid ${isExpanded ? config.border : 'rgba(255,255,255,0.04)'}`,
                                        }}
                                        onClick={() => setExpandedId(isExpanded ? null : action.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                setExpandedId(isExpanded ? null : action.id)
                                            }
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={isExpanded}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-2">
                                                <span style={{ color: config.color }}>{config.icon}</span>
                                                <span
                                                    className="mono text-xs font-medium px-2 py-0.5 rounded-md"
                                                    style={{
                                                        background: config.bg,
                                                        color: config.color,
                                                        border: `1px solid ${config.border}`,
                                                    }}
                                                >
                                                    {action.tool}
                                                </span>
                                            </div>
                                            <span className="text-xs mono" style={{ color: 'var(--color-text-muted)' }}>
                                                {timeFormatter.format(new Date(action.timestamp))}
                                            </span>
                                        </div>

                                        {/* Status badge */}
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: config.color }}
                                            >
                                                {config.label}
                                            </span>
                                        </div>

                                        {/* Expandable details */}
                                        {isExpanded && (
                                            <div className="mt-3 space-y-2 animate-fade-in">
                                                <div>
                                                    <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                                        Input
                                                    </span>
                                                    <pre
                                                        className="mt-1 glass-panel-subtle p-2.5 text-xs mono overflow-x-auto"
                                                        style={{ color: 'var(--color-text-secondary)' }}
                                                    >
                                                        {JSON.stringify(action.input, null, 2)}
                                                    </pre>
                                                </div>

                                                {action.output ? (
                                                    <div>
                                                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                                                            Output
                                                        </span>
                                                        <pre
                                                            className="mt-1 glass-panel-subtle p-2.5 text-xs mono overflow-x-auto"
                                                            style={{ color: 'var(--color-text-secondary)' }}
                                                        >
                                                            {JSON.stringify(action.output, null, 2)}
                                                        </pre>
                                                    </div>
                                                ) : null}

                                                {action.error ? (
                                                    <div>
                                                        <span className="text-xs font-medium text-red-400">Error</span>
                                                        <p className="mt-1 text-xs text-red-300">{action.error}</p>
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default AgentReasoning