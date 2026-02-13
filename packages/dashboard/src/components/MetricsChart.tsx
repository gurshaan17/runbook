import { useQuery } from '@tanstack/react-query'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

interface MetricsData {
    timestamp: number
    cpu: number
    memory: number
}

interface MetricsChartProps {
    containerId: string
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
})

function MetricsChart({ containerId }: MetricsChartProps) {
    const { data: metrics = [] } = useQuery<MetricsData[]>({
        queryKey: ['metrics', containerId],
        queryFn: async () => {
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
        time: timeFormatter.format(new Date(m.timestamp)),
    }))

    // Derive current and peak values
    const latestCpu = metrics.length > 0 ? metrics[metrics.length - 1].cpu : 0
    const latestMem = metrics.length > 0 ? metrics[metrics.length - 1].memory : 0
    const peakCpu = metrics.length > 0 ? Math.max(...metrics.map((m) => m.cpu)) : 0
    const peakMem = metrics.length > 0 ? Math.max(...metrics.map((m) => m.memory)) : 0

    return (
        <div>
            {/* Stat summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="stat-card">
                    <div className="stat-card__label">CPU Usage</div>
                    <div className="stat-card__value" style={{ color: '#3b82f6' }}>
                        {latestCpu.toFixed(1)}%
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__label">Memory Usage</div>
                    <div className="stat-card__value" style={{ color: '#10b981' }}>
                        {latestMem.toFixed(1)}%
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__label">Peak CPU</div>
                    <div className="stat-card__value" style={{ color: 'var(--color-text-secondary)' }}>
                        {peakCpu.toFixed(1)}%
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__label">Peak Memory</div>
                    <div className="stat-card__value" style={{ color: 'var(--color-text-secondary)' }}>
                        {peakMem.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[250px]">
                {metrics.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                            Loading metrics…
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={formattedData}>
                            <defs>
                                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255,255,255,0.04)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="time"
                                stroke="rgba(255,255,255,0.15)"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.15)"
                                tick={{ fill: '#64748b', fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 100]}
                                tickFormatter={(v: number) => `${v}%`}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: 'rgba(17, 24, 39, 0.9)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '10px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                    color: '#f1f5f9',
                                    fontSize: '12px',
                                }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="cpu"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#cpuGradient)"
                                name="CPU %"
                                animationDuration={800}
                            />
                            <Area
                                type="monotone"
                                dataKey="memory"
                                stroke="#10b981"
                                strokeWidth={2}
                                fill="url(#memoryGradient)"
                                name="Memory %"
                                animationDuration={800}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}

export default MetricsChart