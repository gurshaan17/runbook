#!/bin/bash
set -e

echo "🧹 Cleaning project..."

# Clean all packages
pnpm clean --if-present

# Remove pnpm lock and node_modules
rm -rf node_modules pnpm-lock.yaml
rm -rf packages/*/node_modules

# Clean Docker
docker-compose down -v

echo "✅ Clean complete!"
