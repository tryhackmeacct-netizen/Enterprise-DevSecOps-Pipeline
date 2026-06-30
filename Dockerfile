# Stage 1: Build & Package
FROM node:20-alpine AS builder

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

RUN apk upgrade --no-cache

COPY package*.json ./

RUN npm ci --omit=dev --no-audit --fund=false && npm cache clean --force

COPY src/ ./src/

# Stage 2: Minimal Runtime
FROM node:20-alpine AS runner

LABEL org.opencontainers.image.title="Enterprise E-commerce DevSecOps Pipeline - App"
LABEL org.opencontainers.image.description="Containerized e-commerce sample with CI and SAST integration"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.version="1.0.0"

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /usr/src/app

RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src

RUN chown -R node:node /usr/src/app

EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const req = http.request({ host: 'localhost', port: process.env.PORT || 3000, path: '/health', method: 'GET' }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

CMD ["node", "src/server.js"]
