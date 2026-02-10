#!/bin/bash
set -e

echo "🚀 Starting all services..."

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Start development servers
echo "💻 Starting development servers..."
pnpm dev

