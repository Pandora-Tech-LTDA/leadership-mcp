# Deploy HTTP (VPS) — e acesso via Claude web/mobile

O Leadership MCP roda em dois modos a partir do mesmo `index.js`:

- **stdio** (default) — usado pelo pacote npm e pelo Claude Desktop.
- **HTTP** (Streamable HTTP, stateless) — quando `MCP_HTTP_PORT` está definido. É o modo deste
  deploy, e o que permite usar o servidor como **conector personalizado do claude.ai** — que
  funciona no Claude web, desktop **e mobile** a partir de uma única configuração.

No VPS, o container fica atrás do Caddy existente (projeto `docs-site`), que faz TLS.

O deploy de produção (`leadership-mcp.campello.me`) usa **um único domínio para duas coisas**
(ver `Caddyfile.snippet`):

- **`/`** → **landing**, por **proxy reverso para a Vercel** (`leadership-mcp.vercel.app`). A URL
  final continua `.campello.me` — **não é redirect**; o cliente nunca vê o domínio da Vercel.
- **`/mcp`** → **conector MCP, sempre com chave de acesso** (sem acesso indiscriminado). A mesma
  chave (`MCP_BEARER_TOKEN` no `.env` do docs-site, gerada/rotacionada por
  [`rotate-bearer.sh`](rotate-bearer.sh)) é aceita de **duas formas**:
  - `Authorization: Bearer <chave>` — clientes que enviam header (ex.: Claude Code);
  - **chave na URL**: `/mcp/<chave>` — é o caminho para o conector personalizado do claude.ai
    (web/desktop/**mobile**), que não envia header customizado (só suporta OAuth ou nenhum auth).

  Sem chave válida → **401**. A chave é **distribuída por contato** (WhatsApp na landing) — é
  assim que se controla quem acessa; trocar de chave (rotação) corta todos os acessos antigos.
- **`/health`** → healthcheck.

Trade-off consciente da forma "chave na URL": ela aparece em logs de acesso. Aceitável aqui —
ferramentas somente-leitura servindo base já pública; a chave existe para controlar **quem**
acessa, e é rotacionável a custo zero.

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

O conector do claude.ai não envia header customizado, então a chave vai **embutida na URL**
(`/mcp/<chave>`). Requer plano Pro, Max, Team ou Enterprise (contas free têm direito a 1 conector).
Feito uma vez no navegador, o conector fica disponível também no app mobile e no desktop.

1. Receba a sua chave de acesso (via contato/WhatsApp na landing; o mantenedor obtém a atual com
   `./rotate-bearer.sh --print`).
2. Acesse [claude.ai/settings/connectors](https://claude.ai/settings/connectors)
   (Configurações → Conectores).
3. Clique em **Adicionar conector personalizado** (*Add custom connector*).
4. Em URL, informe: `https://leadership-mcp.campello.me/mcp/<chave>` — sem OAuth ID/secret.
5. Numa conversa, abra o menu **+** → **Conectores** e ative o *leadership-mcp*.
6. Para o comportamento completo (pausar e oferecer a consulta), cole o conteúdo de
   [`prompt-sistema.md`](../../prompt-sistema.md) no seu perfil
   (Configurações → Perfil → instruções personalizadas).

Em Team/Enterprise, um Owner adiciona o conector em Organization Settings → Connectors e cada
membro conecta individualmente.

## Gerar / rotacionar a chave de acesso

[`rotate-bearer.sh`](rotate-bearer.sh) gera uma chave nova no VPS via SSH, atualiza o `.env`,
recria só o container Caddy (necessário — o `{$MCP_BEARER_TOKEN}` é lido do env do processo na
subida) e verifica (Bearer novo → 200, chave na URL → 200, sem chave → 401). Rotacionar corta
o acesso de quem tinha a chave antiga — reenvie a URL nova a quem for da casa.

```sh
./rotate-bearer.sh            # rotaciona e verifica; imprime a chave nova e a URL do conector
./rotate-bearer.sh --print    # só mostra a chave atual, sem rotacionar
```

Config por env var (defaults no cabeçalho do script): `SSH_HOST` (default `Pandora-hostinger`),
`MCP_URL`, `ENV_FILE`, `COMPOSE_DIR`, `CADDY_SVC`. **Atenção:** recriar o Caddy dá ~1-2s de blip
em todos os sites desse proxy (docs.campello.me, lp.campello.me, …), não só no leadership-mcp.

## Conectar o Claude Code

Com o header (o `rotate-bearer.sh` imprime o comando pronto):

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp \
  --header "Authorization: Bearer <MCP_BEARER_TOKEN>"
```

Ou, como qualquer outro cliente, com a chave na URL:

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp/<chave>
```

## Verificação

```sh
# Landing na raiz (proxy p/ Vercel; espera 200 text/html, sem redirect):
curl -sI https://leadership-mcp.campello.me/ | grep -iE 'HTTP/|content-type|x-vercel-id'

# Sem chave: espera 401.
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://leadership-mcp.campello.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# Com a chave na URL (espera 200 com handshake; idem com -H "Authorization: Bearer <chave>"):
curl -s https://leadership-mcp.campello.me/mcp/<chave> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```
