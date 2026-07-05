#!/usr/bin/env bash
#
# rotate-bearer.sh — gera/rotaciona o Bearer token do endpoint privado do Leadership MCP.
#
# O endpoint https://leadership-mcp.campello.me/mcp roda na variante PRIVADA (ver
# Caddyfile.snippet): o Caddy exige `Authorization: Bearer {$MCP_BEARER_TOKEN}`. O token
# vive no .env do projeto docs-site e é injetado no container Caddy na subida — por isso
# rotacionar exige RECRIAR o container (um `caddy reload` não relê o env do processo).
#
# O que este script faz, via SSH, de forma atômica:
#   1. gera um token novo (openssl rand -hex 32) no VPS;
#   2. faz backup do .env e substitui a linha MCP_BEARER_TOKEN=;
#   3. recria SÓ o serviço caddy (docker compose up -d --force-recreate caddy);
#   4. imprime o token e verifica: token novo → 200, sem token → 401.
#
# ATENÇÃO: recriar o Caddy reinicia o proxy compartilhado (~1-2s de blip em TODOS os
# sites desse Caddy: docs.campello.me, lp.campello.me, etc.), não só o leadership-mcp.
#
# Uso:
#   ./rotate-bearer.sh                 # rotaciona e verifica
#   ./rotate-bearer.sh --print         # só mostra o token atual (não rotaciona)
#   SSH_HOST=outro ./rotate-bearer.sh  # aponta para outro host SSH
#
# Config (override por env var):
#   SSH_HOST     host SSH do VPS            (default: Pandora-hostinger)
#   MCP_URL      endpoint MCP a verificar   (default: https://leadership-mcp.campello.me/mcp)
#   ENV_FILE     caminho do .env no VPS     (default: /root/pandora-skills/deploy/docs-site/.env)
#   COMPOSE_DIR  dir do docker-compose      (default: /root/pandora-skills/deploy/docs-site)
#   CADDY_SVC    nome do serviço no compose (default: caddy)

set -euo pipefail

SSH_HOST="${SSH_HOST:-Pandora-hostinger}"
MCP_URL="${MCP_URL:-https://leadership-mcp.campello.me/mcp}"
ENV_FILE="${ENV_FILE:-/root/pandora-skills/deploy/docs-site/.env}"
COMPOSE_DIR="${COMPOSE_DIR:-/root/pandora-skills/deploy/docs-site}"
CADDY_SVC="${CADDY_SVC:-caddy}"

INIT_BODY='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"rotate-bearer","version":"1.0"}}}'

# Faz uma chamada initialize com o token dado e ecoa só o status HTTP.
probe() { # $1 = token ("" para sem header)
  local auth=()
  [ -n "${1:-}" ] && auth=(-H "Authorization: Bearer $1")
  curl -s -o /dev/null -w '%{http_code}' -X POST "$MCP_URL" \
    "${auth[@]+"${auth[@]}"}" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d "$INIT_BODY"
}

# --- modo --print: só lê o token atual, sem rotacionar --------------------------------
if [ "${1:-}" = "--print" ]; then
  TOKEN="$(ssh "$SSH_HOST" "grep '^MCP_BEARER_TOKEN=' '$ENV_FILE' | cut -d= -f2-")"
  [ -n "$TOKEN" ] || { echo "erro: MCP_BEARER_TOKEN não encontrado em $ENV_FILE" >&2; exit 1; }
  echo "$TOKEN"
  exit 0
fi

echo "→ rotacionando MCP_BEARER_TOKEN em $SSH_HOST:$ENV_FILE ..." >&2

# --- rotação atômica no VPS -----------------------------------------------------------
NEW_TOKEN="$(ssh "$SSH_HOST" ENV_FILE="$ENV_FILE" COMPOSE_DIR="$COMPOSE_DIR" CADDY_SVC="$CADDY_SVC" 'bash -s' <<'REMOTE'
set -euo pipefail
: "${ENV_FILE:?}" "${COMPOSE_DIR:?}" "${CADDY_SVC:?}"
[ -f "$ENV_FILE" ] || { echo "erro: $ENV_FILE não existe" >&2; exit 1; }

NEW="$(openssl rand -hex 32)"
cp -a "$ENV_FILE" "$ENV_FILE.bak.$(date +%Y%m%d%H%M%S)"

if grep -q '^MCP_BEARER_TOKEN=' "$ENV_FILE"; then
  # substitui a linha inteira; usa | como delimitador (token é hex, sem |)
  sed -i "s|^MCP_BEARER_TOKEN=.*|MCP_BEARER_TOKEN=$NEW|" "$ENV_FILE"
else
  printf '\n# --- Leadership MCP ---\nMCP_BEARER_TOKEN=%s\n' "$NEW" >> "$ENV_FILE"
fi

cd "$COMPOSE_DIR"
docker compose up -d --force-recreate "$CADDY_SVC" >/dev/null 2>&1
echo "$NEW"
REMOTE
)"

[ -n "$NEW_TOKEN" ] || { echo "erro: rotação não retornou token" >&2; exit 1; }

# --- verificação (Caddy leva um instante para subir) ----------------------------------
echo -n "→ aguardando Caddy voltar" >&2
NEW_CODE=""
for _ in $(seq 1 15); do
  NEW_CODE="$(probe "$NEW_TOKEN" || true)"
  [ "$NEW_CODE" = "200" ] && break
  echo -n "." >&2
  sleep 1
done
echo >&2

NO_AUTH_CODE="$(probe '' || true)"

echo >&2
echo "  token novo (Bearer)  → HTTP $NEW_CODE   (esperado 200)" >&2
echo "  sem Authorization    → HTTP $NO_AUTH_CODE   (esperado 401)" >&2
echo >&2

if [ "$NEW_CODE" != "200" ] || [ "$NO_AUTH_CODE" != "401" ]; then
  echo "⚠️  verificação falhou — confira o Caddy no VPS." >&2
  echo "$NEW_TOKEN"
  exit 1
fi

echo "✅ rotacionado e verificado." >&2
echo >&2
echo "Novo token:" >&2
echo "$NEW_TOKEN"
echo >&2
echo "Reconecte o Claude Code (remove o antigo se existir):" >&2
echo "  claude mcp remove leadership 2>/dev/null || true" >&2
echo "  claude mcp add --transport http --scope user leadership $MCP_URL \\" >&2
echo "    --header \"Authorization: Bearer $NEW_TOKEN\"" >&2
