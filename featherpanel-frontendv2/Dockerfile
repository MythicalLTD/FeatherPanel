# Multi-stage build for Next.js frontend
FROM node:22-alpine AS builder

# Set working directory for the builder stage
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies with BuildKit cache mount
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application in standalone mode
RUN pnpm build

# Production stage with nginx + Node.js
FROM node:22-alpine AS production

# Install nginx and supervisor
RUN apk add --no-cache nginx supervisor

# Set working directory
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Copy standalone build from builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy nginx configuration
COPY nginx.conf /etc/nginx/http.d/default.conf

# Create supervisor configuration
RUN mkdir -p /var/log/supervisor && \
    echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo 'user=root' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:nextjs]' >> /etc/supervisord.conf && \
    echo 'command=node server.js' >> /etc/supervisord.conf && \
    echo 'environment=HOSTNAME="0.0.0.0"' >> /etc/supervisord.conf && \
    echo 'directory=/app' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisord.conf && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisord.conf && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisord.conf && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisord.conf

# Expose port 80 (nginx)
EXPOSE 80

# Start supervisor to run both nginx and Next.js
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
