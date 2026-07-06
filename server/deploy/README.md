# Deploy HTTP (VPS) — acesso via Claude web/mobile, tokens por usuário e telemetria

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
- **`/mcp`** → **conector MCP, sempre com chave de acesso** (sem acesso indiscriminado).
- **`/health`** → healthcheck.

## Autenticação: lote de tokens, validado no Node (não mais no Caddy)

A autenticação vive em `server/auth.js` e roda dentro do processo Node — o Caddy é **proxy
puro** para `/mcp` (ver `Caddyfile.snippet`). Isso substitui a chave única antiga
(`MCP_BEARER_TOKEN`, validada em matchers do Caddyfile) por um **lote de tokens**, um por pessoa,
cada um revogável individualmente sem afetar os demais.

- Formato do token: **`lmcp_` + 16 hex** (64 bits de entropia — suficiente para um endpoint
  read-only atrás de TLS, com revogação a custo zero).
- `tokens.json` guarda só o **hash SHA-256** de cada token — o valor em claro só existe na hora
  em que é gerado (saída do `tokens-cli.js`) e no MD de distribuição (repo privado).
- Aceito de **duas formas**, com o mesmo token:
  - `Authorization: Bearer <token>` — clientes que enviam header (ex.: Claude Code);
  - **token na URL**: `/mcp/<token>` — é o caminho para o conector personalizado do claude.ai
    (web/desktop/**mobile**), que não envia header customizado (só suporta OAuth ou nenhum auth).
- **Reload por mtime/tamanho**: `tokens.json` é relido a cada request só se o arquivo mudou —
  criar ou revogar um token vale **na request seguinte**, sem restart do processo.
- **Fail-closed**: se não houver nenhum token ativo cadastrado, **todo** acesso a `/mcp` volta
  `401` (nunca abre sozinho); o boot imprime um aviso em stderr nesse caso.
- **Modo aberto (emergência/debug)**: `LEADERSHIP_MCP_AUTH=off` desliga a checagem inteira — uso
  registrado como `"public"` na telemetria. Não usar em produção fora de uma emergência pontual.

Sem token válido → **401** com header `WWW-Authenticate: Bearer realm="leadership-mcp"`.

Trade-off consciente da forma "token na URL": ele aparece em logs de acesso do Caddy. Aceitável
aqui — ferramentas somente-leitura servindo base já pública; a telemetria (abaixo) permite
identificar e revogar um token vazado.

## Telemetria de uso

`server/usage.js` grava uma linha JSONL por chamada de ferramenta (`buscar_orientacao` /
`listar_gatilhos`): `{ts, user, tool, gatilho, durationMs}`. **Nunca** grava o texto da situação
descrita pelo usuário — só metadados, o suficiente para medir a North Star (usuários ativos
semanais) e ver qual gatilho é mais buscado. Fire-and-forget: um erro de escrita nunca derruba a
resposta ao cliente.

Paths (com defaults só no modo HTTP; overrides sempre disponíveis):

| Env var                        | Default (modo HTTP)     |
|---------------------------------|--------------------------|
| `LEADERSHIP_MCP_TOKENS_FILE`    | `./data/tokens.json`     |
| `LEADERSHIP_MCP_USAGE_LOG`      | `./data/usage.jsonl`     |

No container, `./data` é `/app/data` — ver o volume no `docker-compose.yml`. Em stdio, nenhum dos
dois tem default (não há tokens nem telemetria a menos que a env var seja setada explicitamente).

## Gerenciar tokens

### Localmente (`server/tokens-cli.js`)

```sh
cd server
node tokens-cli.js create <nome> [nota]        # cria 1 token; imprime o valor (só aparece aqui)
node tokens-cli.js list                        # lista nome/status/data (sem o valor em claro)
node tokens-cli.js revoke <nome>                # revoga

# Lote inicial (ex.: os 50 primeiros) + MD de distribuição para anotar quem recebeu cada um:
node tokens-cli.js create-batch 50 --md ./data/distribuicao-tokens.md
```

`create-batch` gera `t001..t0NN`, grava os hashes em `tokens.json` e escreve o MD (default
`./data/distribuicao-tokens.md`, **gitignorado**) com uma tabela `# | Nome | Token | URL do
conector | Entregue a | Data` já com a URL do conector montada, mais os comandos prontos de
conexão (Claude Code e claude.ai). **Esse MD contém tokens em claro — vai para o repo privado
`leadership-mcp-ops`, nunca para o repo público.**

### No VPS, incrementalmente (`server/deploy/tokens-remote.sh`)

Depois que o lote inicial estiver no ar, criar/revogar tokens individuais não precisa mais tocar
no Caddy nem reiniciar nada — só roda `tokens-cli.js` dentro do contêiner via SSH:

```sh
./tokens-remote.sh create <nome> [nota]   # cria; confere com curl (200 Bearer / 401 sem chave)
./tokens-remote.sh list
./tokens-remote.sh revoke <nome>
```

Config por env var (defaults no cabeçalho do script): `SSH_HOST` (default `Pandora-hostinger`),
`MCP_URL`, `COMPOSE_DIR`, `SVC`.

## Pré-requisitos

- DNS: `leadership-mcp.campello.me` A → IP do VPS (Caddy emite o TLS automaticamente após propagar).
- Rede docker `docs-site_docs_net` (criada pelo projeto docs-site/Caddy).

## Passos (primeira subida)

1. Código no VPS em `/root/leadership-mcp/` (rsync ou git clone do diretório `server/`).

2. Subir o serviço:

   ```sh
   cd /root/leadership-mcp/deploy
   docker compose up -d --build
   ```

3. Gerar o lote inicial de tokens **localmente** e copiar o `tokens.json` para o bind mount do
   VPS (`deploy/data/tokens.json`) — ver "Fluxo de migração" abaixo se estiver vindo da chave
   única antiga.

4. Adicionar o bloco de `Caddyfile.snippet` ao Caddyfile do docs-site, validar e recarregar:

   ```sh
   docker exec docs_campello_caddy caddy validate --config /etc/caddy/Caddyfile
   docker exec docs_campello_caddy caddy reload --config /etc/caddy/Caddyfile
   ```

## Fluxo de migração (da chave única para o lote de tokens, sem lockout)

1. **Local**: `node tokens-cli.js create-batch 50 --md ./data/distribuicao-tokens.md`; commitar
   o MD no repo **privado** `leadership-mcp-ops` (nunca o público).
2. **VPS**: `git pull` + `docker compose build` (o container velho segue no ar; o Caddy velho
   ainda valida a chave única — sem downtime).
3. **VPS**: `scp` do `tokens.json` gerado localmente para o bind mount `deploy/data/`.
4. **VPS**: trocar o bloco do Caddyfile pela versão proxy-puro (`Caddyfile.snippet` atual) e
   **recriar o container do Caddy** (`--force-recreate`; um bind mount trocado de inode não é
   enxergado por `reload`). Há uma janela de segundos com o Node novo (fail-closed, mas sem o
   Caddy na frente ainda) — aceitável, tools são read-only.
5. **VPS**: `docker compose up -d leadership-mcp` (Node novo, já fail-closed com os tokens do
   lote).
6. Reconectar o Claude Code com um token do lote (ex.: `t001`) e anotar no MD quem ficou com ele.
   A chave única antiga (64 hex) **não** entra no `tokens.json` novo — morre na migração.
7. Remover `MCP_BEARER_TOKEN` do `.env` do docs-site (não é mais lido por nada).

## Conectar o Claude (web, desktop e mobile) — conector personalizado

O conector do claude.ai não envia header customizado, então o token vai **embutido na URL**
(`/mcp/<token>`). Requer plano Pro, Max, Team ou Enterprise (contas free têm direito a 1 conector).
Feito uma vez no navegador, o conector fica disponível também no app mobile e no desktop.

1. Receba seu token de acesso (via contato/WhatsApp na landing).
2. Acesse [claude.ai/settings/connectors](https://claude.ai/settings/connectors)
   (Configurações → Conectores).
3. Clique em **Adicionar conector personalizado** (*Add custom connector*).
4. Em URL, informe: `https://leadership-mcp.campello.me/mcp/<seu-token>` — sem OAuth ID/secret.
5. Numa conversa, abra o menu **+** → **Conectores** e ative o *leadership-mcp*.
6. Para o comportamento completo (pausar e oferecer a consulta), cole o conteúdo de
   [`prompt-sistema.md`](../../prompt-sistema.md) no seu perfil
   (Configurações → Perfil → instruções personalizadas).

Em Team/Enterprise, um Owner adiciona o conector em Organization Settings → Connectors e cada
membro conecta individualmente (cada um com o próprio token).

## Conectar o Claude Code

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp \
  --header "Authorization: Bearer <seu-token>"
```

Ou, como qualquer outro cliente, com o token na URL:

```sh
claude mcp add --transport http --scope user leadership https://leadership-mcp.campello.me/mcp/<seu-token>
```

## Verificação

```sh
# Landing na raiz (proxy p/ Vercel; espera 200 text/html, sem redirect):
curl -sI https://leadership-mcp.campello.me/ | grep -iE 'HTTP/|content-type|x-vercel-id'

# Sem chave: espera 401 + WWW-Authenticate.
curl -sI -X POST https://leadership-mcp.campello.me/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# Com o token na URL (espera 200 com handshake; idem com -H "Authorization: Bearer <token>"):
curl -s https://leadership-mcp.campello.me/mcp/<token> \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# Token revogado: espera 401 (sem restart nem esperar nada — a checagem já reflete o revoke).
```

**Offline** (CI e local): `cd server && npm run smoke` cobre unidades de auth (válido/inválido/
revogado/reload por mtime/fail-closed), usage (nunca grava o texto da situação) e um e2e HTTP
completo (`startHttp(0)`) com 401/200 e a linha de telemetria certa — tudo sem rede.

## Riscos / limitações

- Token na URL aparece em logs de acesso do Caddy — trade-off aceito; a telemetria permite
  identificar e revogar um token vazado.
- 64 bits de entropia: suficiente para brute-force online atrás de TLS com tools read-only e
  revogação a custo zero — não é o mesmo padrão de segurança de um secret de produção crítico.
- `usage.jsonl` não tem rotação (volume baixo esperado); revisar se o uso crescer muito.
- JSONL/write-stream é seguro só com **1 processo** escrevendo — é a situação atual (um único
  contêiner).
- Clientes podem tentar discovery OAuth ao receber `401` + `WWW-Authenticate` — um `404` no
  `/.well-known/…` é o esperado (não implementado, nem precisa).
