import { useState } from 'react'
import { Activity, Server, BookOpen } from 'lucide-react'
import LogStream from './components/LogStream'
import AgentReasoning from './components/AgentReasoning'
import MetricsChart from './components/MetricsChart'
import RunbookViewer from './components/RunbookViewer'

function App() {
  const [selectedContainer, setSelectedContainer] = useState('demo-app')
  const [activeRunbook, setActiveRunbook] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold">Runbook Executor</h1>
                <p className="text-sm text-gray-400">AI-Powered Infrastructure Self-Healing</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">System Active</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Metrics Row */}
        <div className="mb-6">
          <div className="bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold">Container Metrics</h2>
            </div>
            <MetricsChart containerId={selectedContainer} />
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Logs */}
          <div className="lg:col-span-1 bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold">Live Logs</h2>
              </div>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
              >
                <option value="demo-app">demo-app</option>
                <option value="monitor-mcp">monitor-mcp</option>
                <option value="executor-mcp">executor-mcp</option>
              </select>
            </div>
            <LogStream containerId={selectedContainer} />
          </div>

          {/* Center: Agent Reasoning */}
          <div className="lg:col-span-1 bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold">Agent Activity</h2>
            </div>
            <AgentReasoning onRunbookActivated={setActiveRunbook} />
          </div>

          {/* Right: Runbook */}
          <div className="lg:col-span-1 bg-gray-900 rounded-lg border border-gray-800 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BookOpen className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Active Runbook</h2>
            </div>
            <RunbookViewer runbookType={activeRunbook} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 mt-12">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <p>Runbook Executor v1.0.0</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App