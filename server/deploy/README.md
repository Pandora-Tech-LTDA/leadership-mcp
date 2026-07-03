# Deploy HTTP (VPS) — e acesso via Claude web/mobile

O Leadership MCP roda em dois modos a partir do mesmo `index.js`:

- **stdio** (default) — usado pelo pacote npm e pelo Claude Desktop.
- **HTTP** (Streamable HTTP, stateless) — quando `MCP_HTTP_PORT` está definido. É o modo deste
  deploy, e o que permite usar o servidor como **conector personalizado do claude.ai** — que
  funciona no Claude web, desktop **e mobile** a partir de uma única configuração.

No VPS, o container fica atrás do Caddy existente (projeto `docs-site`), que faz TLS. O endpoint
é **público por default** (ver racional em `Caddyfile.snippet` — ferramentas somente-leitura,
conteúdo já open-source); a variante com Bearer token continua documentada no snippet para
deploys white-label restritos.

## Pré-requisitos

- DNS: `leadership-mcp.campello.me` A → IP do VPS (Caddy emite o TLS automaticamente após propagar).
- Rede docker `docs-site_docs_net` (criada pelo projeto docs-site/Caddy).

## Passos

1. Código no VPS em `/root/leadership-mcp/` (rsync ou git clone do diretório `server/`).

2. Subir o serviço:

   ```sh
   cd /root/leadership-mcp/deploy
   docker compose up -d --build
   ```

3. Adicionar o bloco de `Caddyfile.snippet` ao Caddyfile do docs-site, validar e recarregar:

   ```sh
   docker exec docs_campello_caddy caddy validate --config /etc/caddy/Caddyfile
   docker exec docs_campello_caddy caddy reload --config /etc/caddy/Caddyfile
   ```

## Conectar o Claude (web, desktop e mobile) — conector personalizado

Requer plano Pro, Max, Team ou Enterprise (contas free têm direito a 1 conector). Feito uma vez
no navegador, o conector fica disponível também no app mobile e no desktop.

1. Acesse [claude.ai/settings/connectors](https://claude.ai/settings/connectors)
   (Configurações → Conectores).
2. Clique em **Adicionar conector personalizado** (*Add custom connector*).
3. Em URL, informe: `https://leadership-mcp.campello.me/mcp`
4. Clique em **Adicionar** — sem OAuth ID/secret (o servidor não usa autenticação).
5. Numa conversa, abra o menu **+** → **Conectores** e ative o *leadership-mcp*.
6. Para o comportamento completo (pausar e oferecer a consulta), cole o conteúdo de
   [`prompt-sistema.md`](../../prompt-sistema.md) no seu perfil
   (Configurações → Perfil → instruções personalizadas).

Em Team/Enterprise, um Owner adiciona o conector em Organization Settings → Connectors e cada
membro conecta individualmente.

## Conectar o Claude Code

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp
```

(Na variante privada com Bearer, acrescente `--header "Authorization: Bearer <MCP_BEARER_TOKEN>"`.)

## Verificação

```sh
curl -s https://leadership-mcp.campello.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```
