# Stage 1: Build & Package
FROM node:20.18.0-alpine@sha256:c723f5b74b1e427d142d7e5d8787725916052ad4d0752d53bfefeb3dfd3b9cfb AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Copy package manifest first to leverage Docker layer cache for deps
COPY package*.json ./

# Install only production dependencies to keep builder minimal.
# If you maintain a lockfile, replace the command with `npm ci` for deterministic installs.
RUN npm install --omit=dev && npm cache clean --force && chown -R node:node /usr/src/app

# Copy application source code after installing deps (better cache behavior)
COPY src/ ./src/

# Remove package manifests from the final image to reduce leak surface

# Stage 2: Minimal Runtime
FROM node:20.18.0-alpine@sha256:c723f5b74b1e427d142d7e5d8787725916052ad4d0752d53bfefeb3dfd3b9cfb AS runner

LABEL org.opencontainers.image.title="Enterprise E-commerce DevSecOps Pipeline - App"
LABEL org.opencontainers.image.description="Week 1: Containerized e-commerce sample with CI and SAST integration"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="1.0.0"

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /usr/src/app

# Copy only required artifacts from builder to keep runtime image small
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src

# Ensure files are owned by non-root user
RUN chown -R node:node /usr/src/app || true

# Expose target port
EXPOSE 3000

# Security: run as non-root user provided by the Node image
USER node

# Healthcheck: simple HTTP GET to the internal health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({ host: 'localhost', port: process.env.PORT || 3000, path: '/health', method: 'GET', timeout: 2000 }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Minimal runtime command
CMD ["node", "src/server.js"]
