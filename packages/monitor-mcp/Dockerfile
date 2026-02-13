FROM europe-west1-docker.pkg.dev/friendly-path-465518-r6/archestra-public/mcp-server-base:1.0.42

WORKDIR /app

# Copy root config
USER root
RUN npm install -g pnpm

COPY --chown=mcp:mcp package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package manifests to reconstruct structure
COPY --chown=mcp:mcp packages/monitor-mcp/package.json ./packages/monitor-mcp/
COPY --chown=mcp:mcp packages/shared-types/package.json ./packages/shared-types/

USER mcp

# Install dependencies
RUN pnpm install --filter @runbook/monitor-mcp... --prod

# Copy built files
COPY --chown=mcp:mcp packages/monitor-mcp/dist ./packages/monitor-mcp/dist
COPY --chown=mcp:mcp packages/shared-types/dist ./packages/shared-types/dist

# Set working directory to the service
WORKDIR /app/packages/monitor-mcp

# Set entrypoint
CMD ["node", "dist/index.js"]