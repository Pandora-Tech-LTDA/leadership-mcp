#!/usr/bin/env bash
#
# tokens-remote.sh — cria/lista/revoga tokens de acesso ao /mcp no VPS via SSH, incrementalmente.
#
# Desde que a autenticação saiu do Caddy para o Node (ver Caddyfile.snippet e server/auth.js),
# criar ou revogar um token NÃO recria contêiner nenhum — o tokens.json é recarregado por
# mtime/size a cada request, então a mudança vale na request seguinte. Este script só roda
# server/tokens-cli.js dentro do contêiner via `docker compose exec` e confere o resultado com
# curl (o token novo abre 200; sem chave continua 401 — fail-closed intacto).
#
# Uso:
#   ./tokens-remote.sh create <nome> [nota]   # cria um token; imprime o valor e o `claude mcp add` pronto
#   ./tokens-remote.sh list                   # lista nome/status/data de todos os tokens (sem o valor em claro)
#   ./tokens-remote.sh revoke <nome>          # revoga um token (corta o acesso na hora)
#
# O lote inicial de tokens NÃO passa por este script — é gerado localmente
# (`node tokens-cli.js create-batch 50 --md ...`) e o tokens.json resultante vai por scp para o
# bind mount do VPS (ver deploy/README.md, seção "Fluxo operacional").
#
# Config (override por env var):
#   SSH_HOST     host SSH do VPS            (default: Pandora-hostinger)
#   MCP_URL      endpoint MCP a verificar   (default: https://leadership-mcp.campello.me/mcp)
#   COMPOSE_DIR  dir do docker-compose      (default: /root/leadership-mcp/deploy)
#   SVC          nome do serviço no compose (default: leadership-mcp)

set -euo pipefail

SSH_HOST="${SSH_HOST:-Pandora-hostinger}"
MCP_URL="${MCP_URL:-https://leadership-mcp.campello.me/mcp}"
COMPOSE_DIR="${COMPOSE_DIR:-/root/leadership-mcp/deploy}"
SVC="${SVC:-leadership-mcp}"

INIT_BODY='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"tokens-remote","version":"1.0"}}}'

# Faz uma chamada initialize com o token dado (ou sem header, se "") e ecoa só o status HTTP.
probe() { # $1 = token
  local auth=()
  [ -n "${1:-}" ] && auth=(-H "Authorization: Bearer $1")
  curl -s -o /dev/null -w '%{http_code}' -X POST "$MCP_URL" \
    "${auth[@]+"${auth[@]}"}" \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d "$INIT_BODY"
}

# Roda `node tokens-cli.js <args>` dentro do contêiner, no VPS, via SSH.
remote_exec() {
  local quoted=()
  for arg in "$@"; do quoted+=("$(printf '%q' "$arg")"); done
  ssh "$SSH_HOST" "cd '$COMPOSE_DIR' && docker compose exec -T '$SVC' node tokens-cli.js ${quoted[*]}"
}

usage() {
  echo "Uso: ./tokens-remote.sh <create <nome> [nota] | list | revoke <nome>>" >&2
  exit 1
}

cmd="${1:-}"
[ -n "$cmd" ] && shift || true

case "$cmd" in
  create)
    [ $# -ge 1 ] || { echo "Uso: ./tokens-remote.sh create <nome> [nota]" >&2; exit 1; }
    OUT="$(remote_exec create "$@")"
    echo "$OUT"
    TOKEN="$(echo "$OUT" | sed -n '2p')"
    if [ -n "$TOKEN" ]; then
      echo >&2
      echo "→ verificando..." >&2
      CODE_NEW="$(probe "$TOKEN")"
      CODE_NOAUTH="$(probe "")"
      echo "  token novo (Bearer) → HTTP $CODE_NEW   (esperado 200)" >&2
      echo "  sem chave           → HTTP $CODE_NOAUTH   (esperado 401 — fail-closed intacto)" >&2
      echo >&2
      echo "Claude Code:" >&2
      echo "  claude mcp add --transport http --scope user leadership $MCP_URL \\" >&2
      echo "    --header \"Authorization: Bearer $TOKEN\"" >&2
    fi
    ;;
  list)
    remote_exec list
    ;;
  revoke)
    [ $# -ge 1 ] || { echo "Uso: ./tokens-remote.sh revoke <nome>" >&2; exit 1; }
    remote_exec revoke "$@"
    echo "Revogado. Sem restart nem toque no Caddy — vale na próxima request." >&2
    ;;
  *)
    usage
    ;;
esac
