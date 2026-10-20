# ==============================================================================
# RESOLV Frontend - Multi-Stage Production Dockerfile
# Base: Node 20 Alpine (Build) -> Nginx 1.27 Alpine (Serve)
# ==============================================================================

# Stage 1: Build Vite Production Assets
FROM node:20-alpine AS builder

WORKDIR /app

# Cache package dependencies layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Build production distribution bundle
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# Stage 2: Minimal High-Performance Nginx Web Server
FROM nginx:1.27-alpine AS runner

# Install wget (built-in busybox) for healthcheck
RUN apk add --no-cache ca-certificates

# Clean default html and copy custom production assets & configuration
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Health check verifies Nginx responds on /health endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
