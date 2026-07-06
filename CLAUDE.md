# CLAUDE.md — Memória do projeto Leadership MCP

Guia para qualquer agente de IA (Claude Code, Cursor, etc.) continuar o trabalho neste
repositório. Leia isto primeiro, junto com [`GROWTH.md`](GROWTH.md) (estado operacional).

---

## O que é o projeto

**Leadership MCP** é um servidor **MCP (Model Context Protocol)** open-source (MIT) que entrega uma
**base viva de liderança humanista** ao Claude (ou qualquer cliente MCP). Quando o usuário vai
escrever um e-mail tenso, dar feedback ou comunicar uma decisão, o assistente **pausa, pergunta**
e — se autorizado — molda a resposta a partir de princípios de liderança (Barry-Wehmiller/Bob
Chapman, Simon Sinek). A orientação é sempre **hipótese, nunca prescrição**.

- Pacote npm: **`leadership-mcp`** · Repo: **mcampello/leadership-mcp** (público)
- Autor/mantenedor: Mario Campello (mario@campello.me)
- Idioma da base de conhecimento: **PT-BR**. README principal em **EN** (`README.md`),
  versão PT em `README.pt-BR.md`.

## Arquitetura

- **Linguagem:** JavaScript (ES modules), Node.js ≥18. Única dependência: `@modelcontextprotocol/sdk`.
- **Servidor** (`server/index.js`): registra 2 ferramentas MCP e classifica gatilhos por
  keywords (sem LLM no servidor — determinístico, offline-first).
  - `buscar_orientacao(situacao)` → classifica o gatilho e monta orientação (gatilho → filtros → ação → resultado).
  - `listar_gatilhos()` → taxonomia dos gatilhos.
- **Carregador** (`server/knowledge-loader.js`): busca os `.md` da base **direto do GitHub raw**
  (timeout 4s), com **fallback** para a cópia empacotada em `server/knowledge/`; cache em memória.
  - Env vars: `LEADERSHIP_MCP_REPO` (default `mcampello/leadership-mcp`), `LEADERSHIP_MCP_REF`
    (default `main`) — é o mecanismo de **white-label** (parceiro forka e aponta para o próprio repo).
- **Transportes:** stdio (Claude Desktop) e Streamable HTTP (VPS, quando `MCP_HTTP_PORT` está setado).
  Deploy HTTP documentado em `server/deploy/`. Em produção, `leadership-mcp.campello.me` serve **dois**
  destinos no mesmo domínio (Caddy): `/` → **landing** por proxy reverso para a Vercel (URL continua
  `.campello.me`, não é redirect) e `/mcp` → **conector MCP com chave de acesso SEMPRE obrigatória**
  (decisão 2026-07-06: sem acesso indiscriminado). O servidor só responde a `/`, `/mcp`/`/mcp/<token>`
  e `/health`.
- **Autenticação por lote de tokens** (`server/auth.js`, decisão 2026-07-06): a auth saiu do Caddy
  (que virou proxy puro) e vive no Node — permite um **lote de tokens** (um por pessoa, formato
  `lmcp_` + 16 hex), não mais uma chave única. `tokens.json` guarda só o hash SHA-256 de cada token
  (o valor em claro só existe no MD de distribuição, repo privado) e é recarregado por mtime/tamanho
  a cada request — criar/revogar vale na request seguinte, sem restart. Aceita o token de duas formas
  (mesmo valor): header `Authorization: Bearer` (Claude Code) ou embutido na URL `/mcp/<token>`
  (conector claude.ai web/mobile, que não envia header). **Fail-closed**: sem token ativo cadastrado,
  tudo em `/mcp` volta 401; `LEADERSHIP_MCP_AUTH=off` é a única forma de abrir (só emergência).
  `server/tokens-cli.js` (`npm run tokens`) cria/lista/revoga tokens e gera o lote inicial
  (`create-batch`) com o MD de distribuição pronto (privado, gitignorado). Incrementalmente no VPS,
  usa-se `server/deploy/tokens-remote.sh` (via SSH + `docker compose exec`).
- **Telemetria de uso** (`server/usage.js`): uma linha JSONL por chamada de ferramenta
  (`{ts, user, tool, gatilho, durationMs}`), fire-and-forget, nunca grava o texto da situação — mede
  a North Star (usuários ativos semanais) sem logar conteúdo sensível.
- **Gatilho embutido** (`instructions` do servidor): a constante `INSTRUCTIONS` em `server/index.js`
  é entregue ao cliente MCP no handshake `initialize` (campo `instructions`), que o Claude injeta no
  contexto automaticamente. É o núcleo condensado do gatilho — só instalar o MCP já faz o Claude
  detectar situações relacionais e oferecer a consulta. Texto estático (não faz I/O), espelha a
  taxonomia do array `TRIGGERS`.
- **Prompt de sistema** (`prompt-sistema.md`): reforço **opcional**. No Claude com o MCP instalado o
  gatilho já vem embutido; o prompt reforça o comportamento no ponto mais forte (detecção contextual,
  roteiro de pausa completo). É também o **único caminho** para assistentes sem MCP (ChatGPT,
  Gemini, Grok, Copilot). A cópia do prompt na landing (`docs/index.html`, `<script id="sysPromptText">`)
  deve ser mantida em sincronia com a seção `## Prompt` do arquivo.

## Estrutura do repositório

```
knowledge/            ← base canônica (markdown com frontmatter YAML)
  gatilhos/           ← 6 situações relacionais (conflito, feedback, decisão, relacionamento, externa, pessoal)
  filtros/            ← pilares da liderança humanista (escuta ativa, reconhecimento, serviço, presença,
                        CNV, segurança psicológica, interesses-não-posições, franqueza com cuidado)
  acoes/              ← hipóteses de comportamento concretas
  resultados/         ← efeitos esperados (engajamento, confiança, cultura inclusiva)
server/               ← servidor MCP (Node.js) + cópia de knowledge/ (fallback) + smoke-test + deploy/
docs/                 ← landing estática (index.html) servida pela Vercel/GitHub Pages
README.md             ← EN (descoberta) · README.pt-BR.md ← PT completo
CONTRIBUTING.md, CODE_OF_CONDUCT.md, prompt-sistema.md
GROWTH.md             ← quadro de estado do trabalho de adoção
vercel.json           ← serve docs/ como estático (outputDirectory), sem build
.github/workflows/ci.yml ← smoke test (Node 18/20/22)
```

**Importante:** `knowledge/` na raiz é a **fonte canônica**. `server/knowledge/` é uma cópia de
fallback — regenerada por `npm run sync-knowledge` antes de publicar. Edite sempre a raiz.

## Comandos

```bash
cd server
npm install
npm run smoke          # valida classificação + montagem + auth/usage/e2e HTTP (offline) — é o que o CI roda
npm run inspect        # MCP Inspector interativo
npm run start          # sobe o servidor
npm run sync-knowledge # sincroniza server/knowledge/ a partir de ../knowledge (antes de publicar)
npm run tokens -- create-batch 50 --md ./data/distribuicao-tokens.md  # gera lote de tokens (modo HTTP)
npm publish --access public
```

## Convenções

- **Voz da base:** princípios em voz própria; citações/dados concretos creditam a fonte. Nunca
  atribuir frases genéricas a autores. Tudo é "hipótese de comportamento".
- **Frontmatter dos `.md`:** `type`, `title`, `description`, `tags`, `links` (encadeia as camadas),
  `timestamp`. Ver `CONTRIBUTING.md` para o formato completo.
- **Contribuição:** dois caminhos — abrir issue (templates em `.github/ISSUE_TEMPLATE/`) ou editar
  no navegador. Não exige código.

## Contexto de Growth (resumo — detalhe completo no repo privado `leadership-mcp-ops`)

O trabalho atual é de **adoção/growth**. Decisões estratégicas travadas:

- **Posicionamento (HP4):** "treinamento de liderança evapora → o produto vira a infraestrutura que
  aparece no momento da verdade". Dor org/RH.
- **Motion:** **parceria B2B2C** com empresas de treinamento de liderança (canal primário,
  white-label via fork) + **landing/PLG** como prova e geração de leads. Entrada quente via rede de
  facilitadores do Mario.
- **Separação de marca:** a divulgação NÃO usa a rede pessoal do Mario; usa identidade própria do
  produto + semeadura em comunidades.
- **Bilíngue:** conteúdo/base em PT-BR; descoberta (README, registries, npm) em EN.
- **Web app "experimente agora": adiado** (a landing + demo + conector cobrem o valor sem custo de API).
- **North Star:** usuários ativos semanais que recebem orientação.

**Onde vive o estado e o plano (privado):** repositório **privado `mcampello/leadership-mcp-ops`**
(GitHub Issues). O Linear foi **descontinuado neste projeto** (2026-07-05) — todas as issues ativas
foram migradas para o `leadership-mcp-ops`. Os 3 marcos viraram labels: `marco:fundacao`
(o que se constrói no repo/web), `marco:setup` (tarefas do Mario, uma vez), `marco:operacao` (growth
recorrente); prioridades em `prioridade:urgente|alta|media|baixa`. Documentos de estratégia
(*Plano de Growth*, *Kit de Parceria B2B2C*) também vivem nesse repo privado.

**REGRA (2026-07-05):** todo backlog operacional/estratégico do Leadership MCP vive no repo
**privado `leadership-mcp-ops`** — incluindo estratégia sensível (rede de facilitadores, alvos de
prospecção, contatos, contas/tokens de marca). **Nada disso vai para o repo público `leadership-mcp`.**
Uma issue só é tornada pública quando o Mario pedir **explicitamente**.

## Fluxo de trabalho git

- Trabalhar em branch de feature; abrir PR para `main`. O CI (smoke test) roda em PRs para `main`.
- A landing é publicada pela Vercel a partir da `main` (Production Branch). `docs/` é servido via
  `vercel.json` (`outputDirectory: docs`, sem build) — isolado do `server/`.
- Ao mesclar uma PR, começar o próximo trabalho a partir da `main` atualizada (não reusar PR mesclada).

## Estado atual (atualizar conforme evolui)

- ✅ Fundação pública mesclada na `main`: metadata npm, CODE_OF_CONDUCT, CI, GROWTH.md, README
  bilíngue, landing (`docs/index.html`), vercel.json.
- ✅ Landing publicada na Vercel (pública) e servida também em `https://leadership-mcp.campello.me/`
  via proxy reverso do Caddy (URL final `.campello.me`, não é redirect). O mesmo domínio expõe o
  conector MCP em `/mcp` — **sempre com token de acesso** (Bearer ou `/mcp/<token>` na URL;
  distribuição via WhatsApp na landing). O `/mcp` público sem token (PR #17) foi **revertido**
  em 2026-07-06 a pedido do Mario.
- ✅ Lote de tokens por usuário + telemetria (2026-07, issue privada `leadership-mcp-ops#19`):
  auth saiu do Caddy (proxy puro) e passou para o Node (`server/auth.js`, `server/tokens-cli.js`,
  `server/deploy/tokens-remote.sh`); telemetria mínima em `server/usage.js` (nunca grava a
  situação). Chave única antiga (`MCP_BEARER_TOKEN`, `rotate-bearer.sh`) removida.
- 🔜 Próximos (Fundação): base de marketing `/marketing` (SOPs + kit de semeadura), textos de
  submissão a registries MCP, deck para a rede de facilitadores.
- ⏸️ Web app adiado (STR-201). Chave de API/hospedagem só se ele for revivido.
- ✅ Base ampliada (2026-07): gatilho **relacionamento-pessoal** (família/cônjuge/amizade/sócios),
  4 filtros novos (CNV/Rosenberg, segurança psicológica/Edmondson, interesses-não-posições/Fisher&Ury,
  franqueza com cuidado/Kim Scott+Brené Brown), 3 ações e 1 resultado novos. Classificador com
  regra anti-falso-positivo (keywords fracas só desempatam) e limiar de ativação ≥2; bateria de
  40 casos em `server/eval-cases.js` roda no smoke/CI (40/40). Deploy documenta conector
  personalizado do claude.ai (web/desktop/mobile) com chave de acesso em `server/deploy/`.
