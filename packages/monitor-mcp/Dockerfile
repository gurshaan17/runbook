FROM europe-west1-docker.pkg.dev/friendly-path-465518-r6/archestra-public/mcp-server-base:1.0.42
WORKDIR /app
USER root
# Uses Kubernetes API in-cluster auth; no Docker CLI/socket dependency.
RUN npm install -g pnpm
COPY --chown=mcp:mcp package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=mcp:mcp packages/monitor-mcp/package.json ./packages/monitor-mcp/
COPY --chown=mcp:mcp packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --filter @runbook/monitor-mcp... --prod
COPY --chown=mcp:mcp packages/monitor-mcp/dist ./packages/monitor-mcp/dist
COPY --chown=mcp:mcp packages/shared-types/dist ./packages/shared-types/dist
WORKDIR /app/packages/monitor-mcp
USER root
CMD ["node", "dist/index.js"]
