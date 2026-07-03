#!/usr/bin/env node
// Leadership MCP — servidor MCP (stdio)
//
// Distribui uma base de conhecimento sobre liderança humanista para o Claude. Lê os arquivos
// .md do GitHub raw (com fallback empacotado) — ver knowledge-loader.js.
//
// Ferramentas expostas:
//   - buscar_orientacao(situacao): classifica o gatilho relacional e retorna orientação consolidada
//   - listar_gatilhos(): retorna a taxonomia de gatilhos para navegação/transparência

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer as createHttpServer } from "node:http";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadFile, listDir, parseFrontmatter } from "./knowledge-loader.js";

// ---------------------------------------------------------------------------
// Classificação de gatilho
// ---------------------------------------------------------------------------

// Os 6 gatilhos da taxonomia. A pontuação combina:
//   - keywords fortes (peso 2): descrevem a NATUREZA da situação (agressivo, decisão, feedback…)
//   - weakKeywords (peso 1): descrevem só QUEM (colega, gestor, time…) — co-ocorrem em quase
//     toda situação relacional, então discriminam pouco e não devem dominar a natureza
//   - "sinais de ativação" extraídos do próprio .md do gatilho (peso 1)
// A ideia é refletir a lógica do prompt v0.3 sem depender de IA no servidor.
const TRIGGERS = [
  {
    id: "conflito",
    file: "gatilhos/conflito.md",
    label: "Conflito",
    keywords: [
      "conflito", "tensão", "tenso", "tensa", "desentendimento", "discussão", "discord",
      "briga", "brigu", "atrito", "agressiv", "crítica", "criticou", "injust", "ruptura",
      "clima ruim", "erro grave", "errou", "reclamação", "bronca", "irritad",
      "em círculos", "círculos", "discussão sem fim", "não chegamos a um acordo",
      "não saímos do lugar", "passou por cima", "remoendo", "não se falam", "acusad",
      "acusaç", "desqualific", "na frente dos outros", "hostil", "ofendid", "gritou",
      "perdi a paciência",
    ],
  },
  {
    id: "relacionamento-pessoal",
    file: "gatilhos/relacionamento-pessoal.md",
    label: "Relacionamento Pessoal",
    keywords: [
      "meu irmão", "minha irmã", "meu pai", "minha mãe", "meu filho", "minha filha",
      "esposa", "marido", "namorad", "companheir", "sogr", "cunhad", "meu primo",
      "minha prima", "meu amigo", "minha amiga", "amigo próximo", "amiga próxima",
      "vizinh", "sócio", "sócia", "família", "familiar", "herança", "casamento",
      "divórcio", "adolescente", "magoou", "mágoa", "reaproximar", "reatar",
    ],
  },
  {
    id: "decisao-com-impacto",
    file: "gatilhos/decisao-com-impacto.md",
    label: "Decisão com Impacto",
    keywords: [
      "decisão", "decidir", "comunicar decisão", "cancelamento", "cancelar", "cancelad",
      "demitir", "demissão", "reorganiz", "reestrutur", "priorizar", "priorização", "escalar",
      "mudança", "mudar", "impopular", "anunciar", "comunicado", "impacto",
      "delegar", "delegação", "projeto novo", "novo projeto", "kickoff", "começar um projeto",
      "avisar", "comunico", "preciso comunicar", "vou comunicar", "como conto para",
      "encerrar", "presencial",
    ],
  },
  {
    id: "feedback",
    file: "gatilhos/feedback.md",
    label: "Feedback",
    keywords: [
      "feedback", "avaliação", "avaliar", "reconhec", "elogiar", "elogio", "agradec",
      "retorno", "corrigir comportamento", "parabéns", "reconhecimento", "mérito",
      "conversa difícil", "venho adiando", "vim adiando", "estou adiando", "preciso falar com",
      "avaliação de desempenho", "1:1", "one on one", "apontei", "chorou",
    ],
  },
  {
    id: "relacionamento",
    file: "gatilhos/relacionamento.md",
    label: "Relacionamento Interno",
    keywords: [
      "pedir ajuda", "pedir apoio", "abordar", "abordo", "me relaciono", "onboard",
      "apresentar", "conversar com", "alinhar com", "novo chefe", "nova chefe",
      "novo gestor", "relação melhor", "construir uma relação", "me aproximar",
      "boa impressão", "primeira reunião",
    ],
    // Só indicam QUEM está envolvido — comuns a quase toda situação relacional.
    weakKeywords: [
      "reunião", "gestor", "chefe", "colega", "time", "equipe", "subordinado",
      "liderado", "diretoria",
    ],
  },
  {
    id: "interacao-externa",
    file: "gatilhos/interacao-externa.md",
    label: "Interação Externa",
    keywords: [
      "fornecedor", "parceiro", "parceria", "cliente", "prestador", "lead", "negociar",
      "negociação", "contrato", "externo", "vendor", "atrasando", "entrega do fornecedor",
      "agência", "nos atende",
    ],
  },
];

// Palavras vazias (já normalizadas, sem acento) — ignoradas no matching de sinais para
// não inflar a pontuação com termos comuns a quase toda frase ("como", "para", "preciso"…).
const STOPWORDS = new Set([
  "como", "para", "com", "sem", "que", "uma", "uns", "umas", "dos", "das", "nos", "nas",
  "preciso", "quero", "vou", "tenho", "esse", "essa", "isso", "esta", "este", "estou",
  "sobre", "pelo", "pela", "mais", "menos", "muito", "alguem", "alguma", "algum", "fazer",
  "tive", "tem", "ter", "ser", "estar", "minha", "meu", "seu", "sua", "dele", "dela",
  // Palavras de "quem" — aparecem em quase toda frase sobre trabalho e não discriminam a
  // NATUREZA da situação. Sozinhas, faziam sinais genéricos casarem com tarefas operacionais
  // ("relatório de desempenho do time" ativava relacionamento).
  "time", "equipe", "gestor", "chefe", "colega", "pessoa", "pessoas", "reuniao",
  "lider", "liderado", "liderada", "diretoria", "trabalho",
]);

function normalize(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos para casar variações
}

// Sinais de ativação extraídos do .md (linhas em "## Sinais de ativação"), cacheados.
const signalCache = new Map();
async function loadSignals(trigger) {
  if (signalCache.has(trigger.id)) return signalCache.get(trigger.id);
  const md = await loadFile(trigger.file);
  let signals = [];
  if (md) {
    const section = /##\s*Sinais de ativação\s*\n([\s\S]*?)(\n##\s|\n*$)/.exec(md);
    if (section) {
      signals = section[1]
        .split("\n")
        .map((l) => /^\s*-\s*"?(.+?)"?\.*\s*$/.exec(l))
        .filter(Boolean)
        .map((m) => normalize(m[1]).replace(/\.\.\.$/, "").trim())
        .filter((s) => s.length > 3);
    }
  }
  signalCache.set(trigger.id, signals);
  return signals;
}

export async function classify(situacao) {
  const text = normalize(situacao);
  const scored = [];

  for (const trigger of TRIGGERS) {
    let score = 0;
    const hits = [];

    for (const kw of trigger.keywords) {
      if (text.includes(normalize(kw))) {
        score += 2;
        hits.push(kw);
      }
    }

    const signals = await loadSignals(trigger);
    for (const sig of signals) {
      // casa por sobreposição de palavras significativas do sinal (ignora stopwords)
      const sigWords = sig.split(/\s+/).filter((w) => w.length > 3 && !STOPWORDS.has(w));
      const overlap = sigWords.filter((w) => text.includes(w)).length;
      if (sigWords.length > 0 && overlap >= Math.ceil(sigWords.length / 2)) {
        score += 1;
        hits.push(sig);
      }
    }

    // Keywords fracas só desempatam: descrevem QUEM está envolvido ("time", "reunião"…),
    // presentes em quase toda frase sobre trabalho. Sem uma evidência forte (keyword da
    // natureza da situação ou sinal do .md), não ativam o gatilho sozinhas — era a maior
    // fonte de falsos positivos ("planilha para controlar tarefas do time" ativava gatilho).
    if (score > 0) {
      for (const kw of trigger.weakKeywords || []) {
        if (text.includes(normalize(kw))) {
          score += 1;
          hits.push(kw);
        }
      }
    }

    scored.push({ trigger, score, hits });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

// ---------------------------------------------------------------------------
// Montagem da orientação
// ---------------------------------------------------------------------------

// Score mínimo para ativar um gatilho: um sinal parcial isolado (+1) não basta —
// exige ao menos uma keyword forte ou dois sinais. Reduz ativação espúria.
export const MIN_ACTIVATION_SCORE = 2;

export async function buildGuidance(situacao) {
  const scored = await classify(situacao);
  const top = scored[0];

  if (!top || top.score < MIN_ACTIVATION_SCORE) {
    return [
      "Não identifiquei com confiança um gatilho relacional específico nesta situação.",
      "",
      "Se ela envolve produzir ou estruturar algo para uma pessoa ou grupo, descreva quem é o",
      "destinatário e qual a tensão envolvida, que eu busco a orientação adequada. Caso seja",
      "uma tarefa puramente técnica ou operacional, ela provavelmente não exige orientação cultural.",
    ].join("\n");
  }

  const triggerMd = await loadFile(top.trigger.file);
  const { meta } = parseFrontmatter(triggerMd || "");
  const links = Array.isArray(meta.links) ? meta.links : [];

  // Separa os links por camada.
  const filtros = links.filter((l) => l.startsWith("filtros/"));
  const acoes = links.filter((l) => l.startsWith("acoes/"));
  const resultados = links.filter((l) => l.startsWith("resultados/"));

  const sections = [];
  sections.push(`## Gatilho identificado: ${top.trigger.label}`);

  // Nota comportamental do próprio gatilho, se houver.
  const nota = extractSection(triggerMd, "Nota comportamental");
  if (nota) sections.push(`\n${nota.trim()}`);

  // Filtros conectados (pilares da liderança humanista).
  for (const f of filtros) {
    const summary = await summarizeFile(f, "Princípio");
    if (summary) sections.push(`\n### Filtro — ${summary.title}\n${summary.text}`);
  }

  // Ações sugeridas (hipóteses de comportamento) — a camada mais acionável da
  // orientação, por isso recebe mais espaço que filtros e resultado.
  for (const a of acoes) {
    const summary = await summarizeFile(a, null, 1400);
    if (summary) sections.push(`\n### Ação sugerida — ${summary.title}\n${summary.text}`);
  }

  // Resultado esperado (um, para fechar).
  if (resultados.length > 0) {
    const summary = await summarizeFile(resultados[0], "O que se espera");
    if (summary) sections.push(`\n### Resultado esperado — ${summary.title}\n${summary.text}`);
  }

  sections.push(
    "\n---\n" +
      "Lembrete: isto é uma hipótese de ação baseada em princípios de liderança humanista, " +
      "nunca uma prescrição. Resuma para a pessoa em 3 a 5 linhas e ofereça como sugestão."
  );

  return sections.join("\n");
}

// Extrai o texto de uma seção "## Título" de um markdown.
function extractSection(md, title) {
  if (!md) return null;
  const re = new RegExp(`##\\s*${title}\\s*\\n([\\s\\S]*?)(\\n##\\s|$)`, "i");
  const m = re.exec(md);
  return m ? m[1].trim() : null;
}

// Resumo curto de um arquivo: título do frontmatter + primeira seção relevante.
async function summarizeFile(relPath, preferredSection, maxLen = 600) {
  const md = await loadFile(relPath);
  if (!md) return null;
  const { meta } = parseFrontmatter(md);
  const title = meta.title || relPath;

  let text = preferredSection ? extractSection(md, preferredSection) : null;
  if (!text) {
    // fallback: corpo após o H1, sem o blockquote de abertura ("hipóteses, não
    // prescrições" — o lembrete já fecha a orientação) e sem a seção Conexões
    // (os links já estruturam a própria orientação).
    const body = md.replace(/^---[\s\S]*?---/, "");
    const afterH1 = body.split(/\n#\s.*\n/)[1] || body;
    text = afterH1
      .split("\n")
      .filter((l) => !l.trim().startsWith(">"))
      .join("\n")
      .replace(/\n##\s*Conexões[\s\S]*$/i, "")
      // rebaixa H2 internos (a orientação usa ###) e resolve links .md para texto puro
      .replace(/^##\s*(.+)$/gm, "**$1**")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  }
  text = (text || "").trim();
  if (text.length > maxLen) {
    // corta em fronteira de parágrafo para não interromper frase no meio
    const cut = text.lastIndexOf("\n\n", maxLen);
    text = cut > maxLen * 0.5 ? text.slice(0, cut).trimEnd() : text.slice(0, maxLen - 1).trimEnd() + "…";
  }
  return { title, text };
}

// ---------------------------------------------------------------------------
// Servidor MCP
// ---------------------------------------------------------------------------

// Cria uma instância do servidor MCP com as duas ferramentas registradas. No modo stdio
// usamos uma única instância; no modo HTTP stateless criamos uma por request (recomendação
// do SDK — evita vazamento de estado entre clientes concorrentes).
export function createServer() {
  const server = new McpServer({
    name: "leadership-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "buscar_orientacao",
    {
      title: "Buscar orientação de liderança",
      description:
        "Recebe a descrição de uma situação relacional (em uma frase) e retorna orientação " +
        "comportamental baseada em princípios de liderança humanista. Classifica o gatilho " +
        "(conflito, relacionamento pessoal, decisão com impacto, feedback, relacionamento " +
        "interno, interação externa) e consolida filtros, ação e resultado. Cobre situações de " +
        "trabalho e também pessoais (família, cônjuge, amizade, sócios). " +
        "Use quando a pessoa pedir ajuda para conduzir a parte humana de uma situação.",
      inputSchema: {
        situacao: z
          .string()
          .min(1)
          .describe(
            "Descrição da situação em uma frase, incluindo o destinatário e a tensão. " +
              'Ex.: "como respondo o email agressivo do colega".'
          ),
      },
    },
    async ({ situacao }) => {
      const guidance = await buildGuidance(situacao);
      return { content: [{ type: "text", text: guidance }] };
    }
  );

  server.registerTool(
    "listar_gatilhos",
    {
      title: "Listar gatilhos de liderança",
      description:
        "Retorna a taxonomia dos gatilhos relacionais cobertos pela base de conhecimento, " +
        "com uma breve descrição de cada um. Útil para navegar as categorias disponíveis.",
      inputSchema: {},
    },
    async () => {
      const lines = ["# Gatilhos relacionais cobertos\n"];
      for (const t of TRIGGERS) {
        const md = await loadFile(t.file);
        const { meta } = parseFrontmatter(md || "");
        lines.push(`- **${t.label}** — ${meta.description || "(sem descrição)"}`);
      }
      // Sanity: confirma que a estrutura da base está acessível.
      const dirs = await Promise.all(
        ["gatilhos", "filtros", "acoes", "resultados"].map(async (d) => `${d}/ (${(await listDir(d)).length})`)
      );
      lines.push(`\nEstrutura da base: ${dirs.join(", ")}`);
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Transportes
// ---------------------------------------------------------------------------

// stdio: usado pelo pacote npm / Claude Desktop. Uma única instância de servidor.
async function startStdio() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log apenas em stderr — stdout é reservado para o protocolo MCP.
  console.error("Leadership MCP server rodando (stdio).");
}

// HTTP (Streamable HTTP, stateless): usado no deploy do VPS atrás do Caddy. Cada request
// recebe um par server+transport novo e descartável — sem sessão, sem estado compartilhado.
// A autenticação (Bearer) é feita na borda (Caddy); aqui só tratamos o protocolo MCP.
async function startHttp(port) {
  const httpServer = createHttpServer(async (req, res) => {
    // Healthcheck simples para o Docker/Caddy (não faz parte do protocolo MCP).
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    if (req.url !== "/" && req.url !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: "Not found" }, id: null }));
      return;
    }

    try {
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      // Encerra o par server+transport quando a conexão fechar (modo descartável).
      res.on("close", () => {
        transport.close();
        server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("Erro ao tratar request MCP:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null }));
      }
    }
  });

  httpServer.listen(port, () => {
    console.error(`Leadership MCP server rodando (HTTP) na porta ${port}.`);
  });
}

async function main() {
  const httpPort = process.env.MCP_HTTP_PORT;
  if (httpPort) {
    await startHttp(Number(httpPort));
  } else {
    await startStdio();
  }
}

// Só sobe o transporte stdio quando executado como entrypoint (não ao ser importado,
// p.ex. pelo smoke-test, que reutiliza buildGuidance/classify).
//
// Importante: ao rodar via `npx`/Claude Desktop, o processo é iniciado pelo symlink em
// node_modules/.bin/, então process.argv[1] é o symlink enquanto import.meta.url aponta
// para o arquivo real. Comparar as strings cruas falha e o servidor sai sem subir. Por isso
// resolvemos os dois lados via realpath antes de comparar.
function isMainEntrypoint() {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const invoked = realpathSync(process.argv[1]);
    return realpathSync(thisFile) === invoked;
  } catch {
    return false;
  }
}

if (isMainEntrypoint()) {
  main().catch((err) => {
    console.error("Falha ao iniciar o Leadership MCP:", err);
    process.exit(1);
  });
}
