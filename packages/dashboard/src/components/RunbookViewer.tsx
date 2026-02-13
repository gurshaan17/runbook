import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { BookOpen, ArrowRight } from 'lucide-react'

interface RunbookViewerProps {
    runbookType: string | null
}

function RunbookViewer({ runbookType }: RunbookViewerProps) {
    const { data: runbook } = useQuery({
        queryKey: ['runbook', runbookType],
        queryFn: async () => {
            if (!runbookType) return null

            const runbooks: Record<string, string> = {
                MEMORY_SPIKE: `# Memory Spike Runbook

## Detection
Container memory usage exceeds 80% for more than 2 minutes.

## Steps
1. Check if this is a known memory leak pattern
2. Restart the affected container to free memory
3. Scale service to +2 replicas for redundancy
4. Monitor memory usage for 3 minutes
5. If stable, mark incident as resolved

## Rollback Plan
If memory continues to climb after restart:
- Scale to 5 total replicas
- Alert on-call engineer
- Prepare for manual investigation`,
                HIGH_ERROR_RATE: `# High Error Rate Runbook

## Detection
Error rate exceeds 5% for more than 1 minute.

## Steps
1. Check recent deployments (last 15 minutes)
2. Analyze error patterns in logs
3. If new deployment detected, rollback to previous version
4. If no recent deployment, scale to distribute load
5. Verify error rate returns to normal

## Rollback Plan
If errors persist:
- Scale to 6 replicas
- Enable debug logging
- Alert on-call engineer`,
            }

            return runbooks[runbookType] || null
        },
        enabled: !!runbookType,
    })

    if (!runbookType || !runbook) {
        return (
            <div className="h-[460px] flex flex-col items-center justify-center gap-3">
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse-glow"
                    style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.12)',
                    }}
                >
                    <BookOpen className="w-7 h-7 text-orange-400" aria-hidden="true" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        No Active Runbook
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        Waiting for incident detection…
                    </p>
                </div>
            </div>
        )
    }

    let stepCounter = 0

    return (
        <div
            className="h-[460px] overflow-y-auto pr-1"
            style={{ borderLeft: '2px solid rgba(245, 158, 11, 0.2)' }}
        >
            <div className="pl-4">
                <ReactMarkdown
                    components={{
                        h1: ({ children }) => (
                            <h3
                                className="text-lg font-bold mb-3"
                                style={{ color: 'var(--color-accent-orange)' }}
                            >
                                {children}
                            </h3>
                        ),
                        h2: ({ children }) => (
                            <h4 className="flex items-center gap-2 text-sm font-semibold mt-5 mb-2.5">
                                <ArrowRight className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" aria-hidden="true" />
                                <span style={{ color: 'var(--color-text-primary)' }}>{children}</span>
                            </h4>
                        ),
                        ol: ({ children }) => (
                            <ol className="space-y-2 my-3">{children}</ol>
                        ),
                        li: ({ children }) => {
                            stepCounter++
                            return (
                                <li className="flex items-start gap-2.5">
                                    <span
                                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                                        style={{
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            color: 'var(--color-accent-orange)',
                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                        }}
                                        aria-hidden="true"
                                    >
                                        {stepCounter}
                                    </span>
                                    <span className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                                        {children}
                                    </span>
                                </li>
                            )
                        },
                        ul: ({ children }) => (
                            <ul className="space-y-1.5 my-2 ml-1">{children}</ul>
                        ),
                        p: ({ children }) => (
                            <p className="text-sm my-2 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                                {children}
                            </p>
                        ),
                    }}
                >
                    {runbook}
                </ReactMarkdown>
            </div>
        </div>
    )
}

export default RunbookViewer