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
- **`/mcp`** → **conector MCP, público (sem auth)**. É o modo exigido pelo conector personalizado
  do claude.ai (web/desktop/**mobile**), que não envia header customizado. Risco baixo por desenho:
  ferramentas somente-leitura, determinísticas, servindo base de conhecimento já pública.
- **`/health`** → healthcheck.

A **variante privada (Bearer token)** continua documentada em `Caddyfile.snippet` para deploys
white-label restritos: o Caddy exige `Authorization: Bearer {$MCP_BEARER_TOKEN}` (token no `.env`
do docs-site, gerado/rotacionado por [`rotate-bearer.sh`](rotate-bearer.sh)). **Atenção:** com
Bearer ativo, o conector do claude.ai (web/mobile) **não** consegue conectar — só clientes que
enviam header, como o Claude Code.

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

Produção roda na variante pública, então o conector funciona direto (é o caminho recomendado para
web e **mobile**). Requer plano Pro, Max, Team ou Enterprise (contas free têm direito a 1 conector).
Feito uma vez no navegador, o conector fica disponível também no app mobile e no desktop.

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

## Gerar / rotacionar o Bearer token (só na variante privada)

Só relevante se você estiver rodando a variante privada (Bearer) do `Caddyfile.snippet` — a
produção pública não usa token. [`rotate-bearer.sh`](rotate-bearer.sh) gera um token novo no VPS via SSH, atualiza o `.env`,
recria só o container Caddy (necessário — o `{$MCP_BEARER_TOKEN}` é lido do env do processo na
subida) e verifica (token novo → 200, sem header → 401).

```sh
./rotate-bearer.sh            # rotaciona e verifica; imprime o token novo
./rotate-bearer.sh --print    # só mostra o token atual, sem rotacionar
```

Config por env var (defaults no cabeçalho do script): `SSH_HOST` (default `Pandora-hostinger`),
`MCP_URL`, `ENV_FILE`, `COMPOSE_DIR`, `CADDY_SVC`. **Atenção:** recriar o Caddy dá ~1-2s de blip
em todos os sites desse proxy (docs.campello.me, lp.campello.me, …), não só no leadership-mcp.

## Conectar o Claude Code

Na produção pública, sem header:

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp
```

Na variante privada (Bearer), acrescente o header (o `rotate-bearer.sh` imprime o comando pronto):

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp \
  --header "Authorization: Bearer <MCP_BEARER_TOKEN>"
```

## Verificação

```sh
# Landing na raiz (proxy p/ Vercel; espera 200 text/html, sem redirect):
curl -sI https://leadership-mcp.campello.me/ | grep -iE 'HTTP/|content-type|x-vercel-id'

# Conector MCP (público; espera 200 com handshake):
curl -s https://leadership-mcp.campello.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```
