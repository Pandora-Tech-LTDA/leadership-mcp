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
  Deploy HTTP documentado em `server/deploy/`.
- **Gatilho embutido** (`instructions` do servidor): a constante `INSTRUCTIONS` em `server/index.js`
  é entregue ao cliente MCP no handshake `initialize` (campo `instructions`), que o Claude injeta no
  contexto automaticamente. É o núcleo condensado do gatilho — só instalar o MCP já faz o Claude
  detectar situações relacionais e oferecer a consulta. Texto estático (não faz I/O), espelha a
  taxonomia do array `TRIGGERS`.
- **Prompt de sistema** (`prompt-sistema.md`): reforço **opcional**. No Claude com o MCP instalado o
  gatilho já vem embutido; o prompt reforça o comportamento no ponto mais forte (detecção contextual
  v0.5, roteiro de pausa completo). É também o **único caminho** para assistentes sem MCP (ChatGPT,
  Gemini, Grok, Copilot). A cópia do prompt na landing (`docs/index.html`, `<script id="sysPromptText">`)
  deve ser mantida em sincronia com a seção `## Prompt` do arquivo.

## Estrutura do repositório

```
knowledge/            ← base canônica (markdown com frontmatter YAML)
  gatilhos/           ← 5 situações relacionais (conflito, feedback, decisão, relacionamento, externa)
  filtros/            ← pilares da liderança humanista (escuta ativa, reconhecimento, serviço, presença)
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
npm run smoke          # valida classificação + montagem da orientação (offline) — é o que o CI roda
npm run inspect        # MCP Inspector interativo
npm run start          # sobe o servidor
npm run sync-knowledge # sincroniza server/knowledge/ a partir de ../knowledge (antes de publicar)
npm publish --access public
```

## Convenções

- **Voz da base:** princípios em voz própria; citações/dados concretos creditam a fonte. Nunca
  atribuir frases genéricas a autores. Tudo é "hipótese de comportamento".
- **Frontmatter dos `.md`:** `type`, `title`, `description`, `tags`, `links` (encadeia as camadas),
  `timestamp`. Ver `CONTRIBUTING.md` para o formato completo.
- **Contribuição:** dois caminhos — abrir issue (templates em `.github/ISSUE_TEMPLATE/`) ou editar
  no navegador. Não exige código.

## Contexto de Growth (resumo — detalhe completo no Linear)

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

**Onde vive o estado e o plano (privado):** projeto **"Leadership MCP" no Linear** (workspace
heypandora, time "Stora Bolha", prefixo de issues `STR-`), organizado em 3 marcos: **🏗️ Fundação**
(o que se constrói no repo/web), **🔑 Setup** (tarefas do Mario, uma vez), **🚀 Operação** (growth
recorrente). Documentos no projeto: *Plano de Growth* e *Kit de Parceria B2B2C*. **Não commitar
estratégia sensível (rede de facilitadores, alvos de prospecção) no repo público** — isso fica no Linear.

## Fluxo de trabalho git

- Trabalhar em branch de feature; abrir PR para `main`. O CI (smoke test) roda em PRs para `main`.
- A landing é publicada pela Vercel a partir da `main` (Production Branch). `docs/` é servido via
  `vercel.json` (`outputDirectory: docs`, sem build) — isolado do `server/`.
- Ao mesclar uma PR, começar o próximo trabalho a partir da `main` atualizada (não reusar PR mesclada).

## Estado atual (atualizar conforme evolui)

- ✅ Fundação pública mesclada na `main`: metadata npm, CODE_OF_CONDUCT, CI, GROWTH.md, README
  bilíngue, landing (`docs/index.html`), vercel.json.
- 🔧 Landing em publicação na Vercel (produção); pendente: desligar Deployment Protection para
  ficar pública.
- 🔜 Próximos (Fundação): base de marketing `/marketing` (SOPs + kit de semeadura), textos de
  submissão a registries MCP, deck para a rede de facilitadores.
- ⏸️ Web app adiado (STR-201). Chave de API/hospedagem só se ele for revivido.
