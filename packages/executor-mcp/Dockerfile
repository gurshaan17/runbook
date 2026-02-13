FROM europe-west1-docker.pkg.dev/friendly-path-465518-r6/archestra-public/mcp-server-base:1.0.42
WORKDIR /app
USER root
RUN npm install -g pnpm
COPY --chown=mcp:mcp package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=mcp:mcp packages/executor-mcp/package.json ./packages/executor-mcp/
COPY --chown=mcp:mcp packages/shared-types/package.json ./packages/shared-types/
USER mcp
RUN pnpm install --filter @runbook/executor-mcp... --prod
COPY --chown=mcp:mcp packages/executor-mcp/dist ./packages/executor-mcp/dist
COPY --chown=mcp:mcp packages/shared-types/dist ./packages/shared-types/dist
WORKDIR /app/packages/executor-mcp
CMD ["node", "dist/index.js"]