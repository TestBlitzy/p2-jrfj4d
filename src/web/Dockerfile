# Build stage
FROM node:20-alpine AS builder
# v20 LTS for optimal TypeScript/React development

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production \
    && npm cache clean --force

# Copy source code and configuration files
COPY . .

# Set build-time environment variables
ARG API_URL
ARG APP_VERSION
ENV VITE_API_URL=${API_URL}
ENV VITE_APP_VERSION=${APP_VERSION}
ENV NODE_ENV=production

# Build the application with optimization flags
RUN npm run build

# Production stage
FROM nginx:1.25-alpine
# v1.25 for latest stable features and security updates

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Configure security headers
RUN echo 'add_header X-Frame-Options "DENY";' >> /etc/nginx/conf.d/default.conf \
    && echo 'add_header X-Content-Type-Options "nosniff";' >> /etc/nginx/conf.d/default.conf \
    && echo 'add_header X-XSS-Protection "1; mode=block";' >> /etc/nginx/conf.d/default.conf \
    && echo 'add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\''; style-src '\''self'\''; img-src '\''self'\'' data:; font-src '\''self'\''; connect-src '\''self'\''";' >> /etc/nginx/conf.d/default.conf

# Configure non-root user and permissions
RUN chown -R nginx:nginx /usr/share/nginx/html \
    && chmod -R 755 /usr/share/nginx/html \
    && touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid \
    && chown -R nginx:nginx /var/cache/nginx

# Enable gzip compression
RUN echo 'gzip on;' >> /etc/nginx/conf.d/default.conf \
    && echo 'gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;' >> /etc/nginx/conf.d/default.conf

# Drop all capabilities except NET_BIND_SERVICE
RUN apk add --no-cache libcap \
    && setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx \
    && apk del libcap

# Switch to non-root user
USER nginx

# Configure read-only root filesystem
VOLUME ["/var/cache/nginx", "/var/run"]

# Expose port 80
EXPOSE 80

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Set container metadata
LABEL maintainer="Sales & Intelligence Platform Team" \
      version="1.0.0" \
      description="Sales & Intelligence Platform Web Frontend" \
      security.capabilities="dropped-all" \
      security.read-only="true" \
      monitoring.health-check="enabled"

# Start nginx server
CMD ["nginx", "-g", "daemon off;"]