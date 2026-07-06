# Leadership MCP — imagem para o modo HTTP (Streamable HTTP) atrás do Caddy no VPS.
# O modo stdio (pacote npm / Claude Desktop) não usa esta imagem.
FROM node:22-alpine

WORKDIR /app

# Instala só as dependências de produção a partir do lockfile (camada cacheável).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Código + base de conhecimento empacotada (fallback offline do knowledge-loader).
COPY index.js knowledge-loader.js auth.js usage.js tokens-cli.js ./
COPY knowledge ./knowledge

# Porta HTTP interna (exposta ao Caddy pela rede Docker, não publicada no host).
ENV MCP_HTTP_PORT=3000
EXPOSE 3000

# Healthcheck simples no endpoint /health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "index.js"]
