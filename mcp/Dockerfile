# FeatherPanel MCP Server
FROM node:22-alpine AS builder

WORKDIR /app

# Pin pnpm (matches packageManager); avoid corepack "latest" tag resolution flakiness in CI
RUN npm install -g pnpm@12.3.4

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build && pnpm prune --prod

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV MCP_HOST=0.0.0.0
ENV MCP_PORT=3001
ENV FEATHERPANEL_URL=http://backend:80
ENV MCP_OAUTH_STORE_PATH=/data/oauth-store.json

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Persist OAuth clients/tokens across container recreates (compose mounts a volume here)
RUN mkdir -p /data && chown node:node /data

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node

CMD ["node", "dist/index.js"]
