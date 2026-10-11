# Leadership MCP — imagem para o modo HTTP no Railway.
# O mesmo serviço publica a landing em / e o conector MCP em /mcp.
FROM node:22-alpine

WORKDIR /app

# Instala só as dependências de produção a partir do lockfile (camada cacheável).
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# Código + base de conhecimento empacotada (fallback offline do knowledge-loader).
COPY server/index.js server/knowledge-loader.js server/auth.js server/usage.js server/consultations.js server/tokens-cli.js ./
COPY server/knowledge ./knowledge
COPY docs ./docs

# Porta HTTP fornecida pelo Railway.
ENV MCP_HTTP_PORT=3000
EXPOSE 3000

# Healthcheck simples no endpoint /health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
