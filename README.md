# 🤖 Runbook Executor

AI-Powered Infrastructure Self-Healing Platform

## Overview
Automatically detects, diagnoses, and fixes infrastructure issues using AI-powered runbook execution.

## Architecture
```
Archestra Platform
├── Monitor MCP (detects issues)
├── Executor MCP (fixes issues)
└── Orchestrator Agent (coordinates)
```

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- Docker

### Installation
```bash
# Clone repository
git clone <your-repo>
cd runbook

# Run setup
./scripts/setup.sh
```

### Development
```bash
# Start all services
./scripts/start-all.sh

# Or manually:
# Terminal 1: Start Docker services
docker-compose up

# Terminal 2: Start development servers
pnpm dev
```

### Access Points
- **Dashboard**: http://localhost:5173
- **Archestra UI**: http://localhost:3000
- **Demo App**: http://localhost:3001-3003

## Project Structure
```
runbook/
├── packages/
│   ├── monitor-mcp/      # Detects issues
│   ├── executor-mcp/     # Executes fixes
│   ├── demo-app/         # Test application
│   ├── dashboard/        # UI dashboard
│   └── shared-types/     # Shared TypeScript types
├── runbooks/             # Runbook markdown files
├── scripts/              # Helper scripts
└── docker-compose.yml    # Docker orchestration
```

## Development Workflow
1. Make changes in any package
2. Changes auto-reload via `tsx watch` or `vite`
3. Test by triggering bugs in demo app
4. Watch AI agent execute runbooks

## Building for Production
```bash
pnpm build
```

## License
MIT
