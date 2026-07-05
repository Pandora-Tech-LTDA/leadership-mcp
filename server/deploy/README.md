# Deploy HTTP (VPS) — e acesso via Claude web/mobile

O Leadership MCP roda em dois modos a partir do mesmo `index.js`:

- **stdio** (default) — usado pelo pacote npm e pelo Claude Desktop.
- **HTTP** (Streamable HTTP, stateless) — quando `MCP_HTTP_PORT` está definido. É o modo deste
  deploy, e o que permite usar o servidor como **conector personalizado do claude.ai** — que
  funciona no Claude web, desktop **e mobile** a partir de uma única configuração.

No VPS, o container fica atrás do Caddy existente (projeto `docs-site`), que faz TLS.

O deploy de produção (`leadership-mcp.campello.me`) roda na **variante privada (Bearer token)**:
o Caddy exige `Authorization: Bearer {$MCP_BEARER_TOKEN}` e responde 401 sem ele. O token vive no
`.env` do projeto docs-site e é injetado no container Caddy. Para gerar/rotacionar o token use
[`rotate-bearer.sh`](rotate-bearer.sh) (ver seção abaixo). A variante **pública** (sem auth)
continua documentada em `Caddyfile.snippet` — racional e trade-offs lá; nela o conector do
claude.ai conecta sem token, mas com Bearer ativo o conector web/mobile **não** consegue conectar
(só clientes que enviam header, como o Claude Code).

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

> ⚠️ **Só funciona na variante pública.** Com o Bearer token ativo (produção atual) o conector
> do claude.ai — web, desktop e mobile — **não consegue conectar**, pois esses clientes não
> enviam header customizado. Para expor pelo conector, troque para a variante pública do
> `Caddyfile.snippet`. Com Bearer, use o Claude Code (seção acima).

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

## Gerar / rotacionar o Bearer token

[`rotate-bearer.sh`](rotate-bearer.sh) gera um token novo no VPS via SSH, atualiza o `.env`,
recria só o container Caddy (necessário — o `{$MCP_BEARER_TOKEN}` é lido do env do processo na
subida) e verifica (token novo → 200, sem header → 401).

```sh
./rotate-bearer.sh            # rotaciona e verifica; imprime o token novo
./rotate-bearer.sh --print    # só mostra o token atual, sem rotacionar
```

Config por env var (defaults no cabeçalho do script): `SSH_HOST` (default `Pandora-hostinger`),
`MCP_URL`, `ENV_FILE`, `COMPOSE_DIR`, `CADDY_SVC`. **Atenção:** recriar o Caddy dá ~1-2s de blip
em todos os sites desse proxy (docs.campello.me, lp.campello.me, …), não só no leadership-mcp.

## Conectar o Claude Code (variante privada — produção atual)

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp \
  --header "Authorization: Bearer <MCP_BEARER_TOKEN>"
```

O `rotate-bearer.sh` imprime este comando já preenchido com o token novo. Na variante pública
(sem Bearer), omita o `--header`.

## Verificação

```sh
curl -s https://leadership-mcp.campello.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```
