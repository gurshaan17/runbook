# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files first (important for caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package manifests
COPY packages/demo-app/package.json ./packages/demo-app/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install all dependencies (workspace-aware)
RUN pnpm install --frozen-lockfile

# Copy full source
COPY packages ./packages

# Build the app
WORKDIR /app/packages/demo-app
RUN pnpm build


# ---------- Production ----------
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy package manifests
COPY --from=builder /app/packages/demo-app/package.json ./packages/demo-app/
COPY --from=builder /app/packages/shared-types/package.json ./packages/shared-types/

# Install ONLY production deps, workspace-safe
RUN pnpm install --prod --frozen-lockfile

# Copy built output and required workspace packages
COPY --from=builder /app/packages/demo-app/dist ./packages/demo-app/dist
COPY --from=builder /app/packages/shared-types ./packages/shared-types

# Create non-root user/group and ensure app files are owned by it
RUN addgroup -S appuser && adduser -S appuser -G appuser \
  && mkdir -p /app/tmp /app/logs \
  && chown -R appuser:appuser /app

# Expose app port
EXPOSE 3000

# Run as non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Run app
CMD ["node", "packages/demo-app/dist/server.js"]
