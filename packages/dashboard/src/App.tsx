import { useState } from 'react'
import { Activity, Server, BookOpen, Shield, Clock, Box } from 'lucide-react'
import LogStream from './components/LogStream'
import AgentReasoning from './components/AgentReasoning'
import MetricsChart from './components/MetricsChart'
import RunbookViewer from './components/RunbookViewer'

function App() {
  const [selectedContainer, setSelectedContainer] = useState('demo-app')
  const [activeRunbook, setActiveRunbook] = useState<string | null>(null)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg-deep)' }}>
      {/* Header */}
      <header className="gradient-border" style={{ background: 'var(--color-bg-base)' }}>
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-xl"
                style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))' }}
              >
                <Activity className="w-5 h-5 text-blue-400" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">Runbook Executor</h1>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  AI-Powered Infrastructure Self-Healing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Status pills */}
              <div className="hidden md:flex items-center gap-4">
                <div className="stat-card flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-green-400" aria-hidden="true" />
                  <span className="text-xs font-medium text-green-400">Protected</span>
                </div>
                <div className="stat-card flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                  <span className="text-xs mono" style={{ color: 'var(--color-text-secondary)' }}>
                    99.9% Uptime
                  </span>
                </div>
                <div className="stat-card flex items-center gap-2">
                  <Box className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} aria-hidden="true" />
                  <span className="text-xs mono" style={{ color: 'var(--color-text-secondary)' }}>
                    3 Containers
                  </span>
                </div>
              </div>

              {/* System status */}
              <div className="flex items-center gap-2">
                <div className="status-dot status-dot--active animate-pulse-glow" />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  System Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-6 py-6" role="main">
        {/* Metrics Row */}
        <section className="mb-6 animate-fade-in" aria-label="Container metrics">
          <div className="glass-panel p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Container Metrics
                </h2>
              </div>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="custom-select"
                aria-label="Select container"
              >
                <option value="demo-app">demo-app</option>
                <option value="monitor-mcp">monitor-mcp</option>
                <option value="executor-mcp">executor-mcp</option>
              </select>
            </div>
            <MetricsChart containerId={selectedContainer} />
          </div>
        </section>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Logs */}
          <section
            className="lg:col-span-1 glass-panel p-6 animate-fade-in"
            style={{ animationDelay: '100ms' }}
            aria-label="Live logs"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Live Logs
                </h2>
              </div>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="custom-select"
                aria-label="Select container for logs"
              >
                <option value="demo-app">demo-app</option>
                <option value="monitor-mcp">monitor-mcp</option>
                <option value="executor-mcp">executor-mcp</option>
              </select>
            </div>
            <LogStream containerId={selectedContainer} />
          </section>

          {/* Center: Agent Reasoning */}
          <section
            className="lg:col-span-1 glass-panel p-6 animate-fade-in"
            style={{ animationDelay: '200ms' }}
            aria-label="Agent activity"
          >
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Agent Activity
              </h2>
            </div>
            <AgentReasoning onRunbookActivated={setActiveRunbook} />
          </section>

          {/* Right: Runbook */}
          <section
            className="lg:col-span-1 glass-panel p-6 animate-fade-in"
            style={{ animationDelay: '300ms' }}
            aria-label="Active runbook"
          >
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Active Runbook
              </h2>
            </div>
            <RunbookViewer runbookType={activeRunbook} />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="mt-12"
        style={{
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg-base)',
        }}
      >
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs mono" style={{ color: 'var(--color-text-muted)' }}>
              Runbook Executor v1.0.0
            </span>
            <div className="flex items-center gap-2">
              <div className="status-dot status-dot--active" />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Connected
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App