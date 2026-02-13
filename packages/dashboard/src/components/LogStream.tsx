import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Info, Server } from 'lucide-react'

interface LogEntry {
    timestamp: string
    level: string
    message: string
}

interface LogStreamProps {
    containerId: string
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
})

function LogStream({ containerId }: LogStreamProps) {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const logsEndRef = useRef<HTMLDivElement>(null)
    const [autoScroll, setAutoScroll] = useState(true)

    const { data } = useQuery({
        queryKey: ['logs', containerId],
        queryFn: async () => {
            const response = await fetch(`http://localhost:8001/api/logs/${containerId}?lines=50`)
            if (!response.ok) throw new Error('Failed to fetch logs')
            return response.json()
        },
        refetchInterval: 2000,
    })

    useEffect(() => {
        if (data?.logs) {
            setLogs(data.logs)
        }
    }, [data])

    useEffect(() => {
        if (autoScroll) {
            logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, autoScroll])

    const getLogIcon = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR':
            case 'FATAL':
                return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" aria-hidden="true" />
            case 'WARN':
                return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" aria-hidden="true" />
            default:
                return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" aria-hidden="true" />
        }
    }

    const getLogAccent = (level: string) => {
        switch (level.toUpperCase()) {
            case 'ERROR':
            case 'FATAL':
                return { color: 'rgb(248, 113, 113)', borderColor: 'rgba(239, 68, 68, 0.4)' }
            case 'WARN':
                return { color: 'rgb(251, 191, 36)', borderColor: 'rgba(245, 158, 11, 0.4)' }
            case 'DEBUG':
                return { color: 'var(--color-text-muted)', borderColor: 'transparent' }
            default:
                return { color: 'var(--color-text-secondary)', borderColor: 'transparent' }
        }
    }

    return (
        <div className="h-[460px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs mono" style={{ color: 'var(--color-text-muted)' }}>
                    {logs.length} lines
                </span>
                <button
                    type="button"
                    onClick={() => setAutoScroll(!autoScroll)}
                    className={`pill-button ${autoScroll ? 'active' : ''}`}
                    aria-label={autoScroll ? 'Disable auto-scroll' : 'Enable auto-scroll'}
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            background: autoScroll ? 'var(--color-accent-blue)' : 'var(--color-text-muted)',
                        }}
                        aria-hidden="true"
                    />
                    Auto-scroll
                </button>
            </div>

            <div
                className="flex-1 overflow-y-auto glass-panel-subtle p-2"
                role="log"
                aria-live="polite"
                aria-label="Application logs"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                        <Server className="w-8 h-8 animate-pulse-glow" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Waiting for logs…
                        </p>
                    </div>
                ) : (
                    <div className="space-y-px">
                        {logs.map((log, index) => {
                            const accent = getLogAccent(log.level)
                            return (
                                <div
                                    key={index}
                                    className="log-line flex items-start gap-2 px-2.5 py-1.5 rounded-md transition-colors"
                                    style={{
                                        borderLeft: `2px solid ${accent.borderColor}`,
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent'
                                    }}
                                >
                                    {getLogIcon(log.level)}
                                    <span
                                        className="text-xs flex-shrink-0 mono"
                                        style={{ color: 'var(--color-text-muted)' }}
                                    >
                                        {timeFormatter.format(new Date(log.timestamp))}
                                    </span>
                                    <span className="flex-1 min-w-0 break-words" style={{ color: accent.color }}>
                                        {log.message}
                                    </span>
                                </div>
                            )
                        })}
                        <div ref={logsEndRef} />
                    </div>
                )}
            </div>
        </div>
    )
}

export default LogStream