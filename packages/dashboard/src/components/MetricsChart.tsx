import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MetricsData {
  timestamp: number
  cpu: number
  memory: number
}

interface MetricsChartProps {
  containerId: string
}

function MetricsChart({ containerId }: MetricsChartProps) {
  const { data: metrics = [] } = useQuery<MetricsData[]>({
    queryKey: ['metrics', containerId],
    queryFn: async () => {
      // Mock data - replace with actual API
      const now = Date.now()
      return Array.from({ length: 20 }, (_, i) => ({
        timestamp: now - (19 - i) * 5000,
        cpu: Math.random() * 50 + 20,
        memory: Math.random() * 40 + 40,
      }))
    },
    refetchInterval: 5000,
  })

  const formattedData = metrics.map((m) => ({
    ...m,
    time: new Date(m.timestamp).toLocaleTimeString(),
  }))

  return (
    <div className="h-[300px]">
      {metrics.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Loading metrics...</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9CA3AF"
              style={{ fontSize: '12px' }}
            />
            <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cpu"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              name="CPU %"
            />
            <Line
              type="monotone"
              dataKey="memory"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              name="Memory %"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export default MetricsChart