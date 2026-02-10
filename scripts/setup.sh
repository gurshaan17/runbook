#!/bin/bash
set -e

echo "🚀 Setting up Runbook Executor..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared types first
echo "🔨 Building shared types..."
pnpm --filter shared-types build

# Build all packages
echo "🔨 Building all packages..."
pnpm build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm dev' to start development servers"
echo "  2. Run 'docker-compose up' to start Archestra"
