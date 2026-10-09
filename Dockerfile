# Railway build: one service for landing + MCP.
FROM node:22-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/index.js server/knowledge-loader.js server/auth.js server/usage.js server/tokens-cli.js ./
COPY server/knowledge ./knowledge
COPY docs ./docs

ENV MCP_HTTP_PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
