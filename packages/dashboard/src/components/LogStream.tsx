import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, Info } from 'lucide-react'

interface LogEntry {
  timestamp: string
  level: string
  message: string
}

interface LogStreamProps {
  containerId: string
}

function LogStream({ containerId }: LogStreamProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Fetch logs every 2 seconds
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
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'WARN':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
      case 'FATAL':
        return 'text-red-400'
      case 'WARN':
        return 'text-yellow-400'
      case 'DEBUG':
        return 'text-gray-500'
      default:
        return 'text-gray-300'
    }
  }

  return (
    <div className="h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{logs.length} lines</span>
        <label className="flex items-center space-x-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          <span>Auto-scroll</span>
        </label>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-950 rounded border border-gray-800 p-3">
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No logs available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="log-line flex items-start space-x-2 hover:bg-gray-900 px-2 py-1 rounded">
                {getLogIcon(log.level)}
                <span className="text-gray-500 text-xs">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`flex-1 ${getLogColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  )
}

export default LogStream