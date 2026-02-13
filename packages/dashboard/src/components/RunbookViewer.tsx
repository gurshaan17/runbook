import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import { BookOpen, Circle } from 'lucide-react'

interface RunbookViewerProps {
  runbookType: string | null
}

function RunbookViewer({ runbookType }: RunbookViewerProps) {
  const { data: runbook } = useQuery({
    queryKey: ['runbook', runbookType],
    queryFn: async () => {
      if (!runbookType) return null
      
      // Mock data - replace with actual fetch from runbooks folder
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
      <div className="h-[500px] flex flex-col items-center justify-center text-gray-500">
        <BookOpen className="w-12 h-12 mb-3 opacity-50" />
        <p>No active runbook</p>
        <p className="text-sm mt-1">Waiting for incident detection...</p>
      </div>
    )
  }

  return (
    <div className="h-[500px] overflow-y-auto">
      <div className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ node, ...props }) => (
              <h1 className="text-xl font-bold text-orange-400 mb-4" {...props} />
            ),
            h2: ({ node, ...props }) => (
              <h2 className="text-lg font-semibold text-gray-200 mt-4 mb-2" {...props} />
            ),
            ol: ({ node, ...props }) => (
              <ol className="space-y-2 my-3" {...props} />
            ),
            li: ({ node, children, ...props }) => (
              <li className="flex items-start space-x-2" {...props}>
                <Circle className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                <span className="text-gray-300">{children}</span>
              </li>
            ),
            p: ({ node, ...props }) => (
              <p className="text-gray-400 my-2" {...props} />
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