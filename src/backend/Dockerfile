# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build essentials
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies with exact versions
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Prune dev dependencies and clear npm cache
RUN npm prune --production && \
    npm cache clean --force

# Runtime stage
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Install curl for health checks
RUN apk add --no-cache curl && \
    # Create non-root user
    addgroup -g 1001 nodegroup && \
    adduser -u 1001 -G nodegroup -s /bin/sh -D nodeuser && \
    # Create app directory and set permissions
    mkdir -p /usr/src/app/dist && \
    chown -R nodeuser:nodegroup /usr/src/app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC \
    NODE_OPTIONS=--max-old-space-size=2048

# Copy built artifacts from builder stage
COPY --from=builder --chown=nodeuser:nodegroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodegroup /usr/src/app/dist ./dist
COPY --from=builder --chown=nodeuser:nodegroup /usr/src/app/package.json ./

# Expose application port
EXPOSE 3000

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodeuser

# Start application
CMD ["node", "dist/api/server.js"]