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
import { Pool } from "pg";
import { z } from "zod";
import { createServer as createHttpServer } from "node:http";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFile, listDir, parseFrontmatter } from "./knowledge-loader.js";
import { authenticate, generateToken, hasActiveTokens, hashToken, loadTokens, PATH_TOKEN_RE, saveTokens } from "./auth.js";
import { configureUsage, logUsage } from "./usage.js";

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

// Retorna {text, gatilho}: `gatilho` é o id do gatilho classificado (ou null se nenhum ativou)
// — a telemetria de uso precisa dele sem rodar o classificador uma segunda vez.
export async function buildGuidance(situacao) {
  const scored = await classify(situacao);
  const top = scored[0];

  if (!top || top.score < MIN_ACTIVATION_SCORE) {
    return {
      gatilho: null,
      text: [
        "Não identifiquei com confiança um gatilho relacional específico nesta situação.",
        "",
        "Se ela envolve produzir ou estruturar algo para uma pessoa ou grupo, descreva quem é o",
        "destinatário e qual a tensão envolvida, que eu busco a orientação adequada. Caso seja",
        "uma tarefa puramente técnica ou operacional, ela provavelmente não exige orientação cultural.",
      ].join("\n"),
    };
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
      "nunca uma prescrição. Resuma para a pessoa em 3 a 5 linhas e ofereça como sugestão. " +
      "Não cite nomes de autores, líderes ou fontes ao resumir — apresente tudo como " +
      "orientação do Leadership MCP (as citações já vivem dentro da base)."
  );

  return { gatilho: top.trigger.id, text: sections.join("\n") };
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

// Instruções entregues ao cliente MCP no handshake `initialize` (campo `instructions`).
// O cliente (Claude Desktop e outros clientes MCP) injeta este texto no contexto
// automaticamente — sem o usuário colar nada. É o que faz o gatilho relacional funcionar
// só instalando o MCP: o `prompt-sistema.md` deixa de ser pré-requisito e vira reforço
// opcional (e segue sendo o caminho para assistentes sem MCP).
//
// Núcleo CONDENSADO de propósito: descreve QUANDO oferecer a consulta e a taxonomia dos 5
// gatilhos, sem replicar o roteiro completo de detecção contextual do prompt-sistema.md.
// Texto ESTÁTICO de propósito: `createServer()` é síncrona e, no modo HTTP, roda uma vez
// por request — montar via `loadFile` (async/rede) aqui quebraria o offline-first. A
// taxonomia é estável (espelha o array TRIGGERS acima).
export const INSTRUCTIONS = [
  "Este servidor entrega uma base viva de liderança humanista. A orientação retornada é",
  "sempre uma HIPÓTESE de ação, nunca uma prescrição.",
  "",
  "Quando a tarefa for PRODUZIR ou ESTRUTURAR algo para ou sobre uma pessoa ou grupo",
  "(e-mail, mensagem, comunicado, feedback, roteiro, post, apresentação) ou CONDUZIR uma",
  "conversa com carga emocional — no trabalho ou na vida pessoal —, trate como um",
  "gatilho relacional e classifique-o silenciosamente em uma destas categorias:",
  "  1. Conflito — tensão, desentendimento, crítica, clima ruim.",
  "  2. Relacionamento Pessoal — família, cônjuge, amizade, vizinhança, sócios.",
  "  3. Decisão com Impacto — comunicar/escalar/delegar algo que afeta outras pessoas.",
  "  4. Feedback — reconhecer, agradecer, corrigir comportamento, responder avaliação.",
  "  5. Relacionamento Interno — pedir, apresentar ou alinhar com gestor, colega ou time.",
  "  6. Interação Externa — fornecedor, parceiro, cliente ou lead.",
  "",
  "Nesses casos, ANTES de escrever, ofereça uma escolha: consultar o Leadership MCP — que",
  "reúne orientações dos maiores guias de liderança do mundo — via ferramenta",
  "`buscar_orientacao` (descrevendo a situação em uma frase) e moldar a resposta a partir",
  "dela desde o início, ou responder direto. Se a pessoa recusar, responda normalmente sem",
  "insistir. O gatilho pode vir do CONTEÚDO que você acessou (um e-mail tenso, uma cobrança),",
  "não só das palavras do pedido.",
  "",
  "Ao oferecer a consulta e ao apresentar a orientação, refira-se apenas ao Leadership MCP.",
  "NUNCA cite nomes de autores, líderes ou fontes da base — as citações já vivem dentro dela.",
  "",
  "Tarefa puramente técnica, conceitual ou operacional, sem destinatário humano, NÃO é",
  "gatilho — responda direto. Use `listar_gatilhos` para navegar as categorias cobertas.",
].join("\n");

// Cria uma instância do servidor MCP com as duas ferramentas registradas. No modo stdio
// usamos uma única instância; no modo HTTP stateless criamos uma por request (recomendação
// do SDK — evita vazamento de estado entre clientes concorrentes).
// `context.user` identifica quem autenticou a request (nome do token, ou "public" em modo
// aberto) — propagado para a telemetria de uso (usage.js), nunca para a base de conhecimento.
export function createServer(context = { user: null }) {
  const server = new McpServer(
    {
      name: "leadership-mcp",
      title: "Leadership MCP",
      version: "0.2.0",
      websiteUrl: "https://leadership-mcp.campello.me",
      icons: [
        {
          src: "https://leadership-mcp.campello.me/icon.png",
          mimeType: "image/png",
          sizes: ["512x512"],
        },
      ],
    },
    { instructions: INSTRUCTIONS }
  );

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
      const start = Date.now();
      const guidance = await buildGuidance(situacao);
      logUsage({
        user: context.user,
        tool: "buscar_orientacao",
        gatilho: guidance.gatilho,
        durationMs: Date.now() - start,
      });
      return { content: [{ type: "text", text: guidance.text }] };
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
      const start = Date.now();
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
      logUsage({
        user: context.user,
        tool: "listar_gatilhos",
        gatilho: null,
        durationMs: Date.now() - start,
      });
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// Transportes
// ---------------------------------------------------------------------------

// Paths default só fazem sentido no modo HTTP (stdio não tem tokens nem telemetria a menos
// que a env var override seja setada explicitamente).
const DEFAULT_TOKENS_FILE = "./data/tokens.json";
const DEFAULT_USAGE_FILE = "./data/usage.jsonl";

// A landing fica no mesmo serviço HTTP no Railway, eliminando a dependência da Vercel.
// Mantém o fallback local para o servidor executado diretamente a partir de ./server.
const LANDING_DIR_CANDIDATES = [
  process.env.LEADERSHIP_MCP_LANDING_DIR,
  resolve(process.cwd(), "docs"),
  resolve(process.cwd(), "../docs"),
].filter(Boolean);

function landingFile(requestPath) {
  const relative = requestPath === "/" ? "index.html" : requestPath.slice(1);
  if (!relative || relative.includes("\\0") || relative.split("/").includes("..")) return null;
  for (const dir of LANDING_DIR_CANDIDATES) {
    const candidate = join(dir, relative);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function serveLanding(req, res) {
  if (req.method !== "GET") return false;
  const file = landingFile(new URL(req.url || "/", "http://localhost").pathname);
  if (!file) return false;
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
  };
  res.writeHead(200, { "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream" });
  res.end(readFileSync(file));
  return true;
}

const REGISTER_PATH_RE = /^\/cadastro\/(lmcp_[0-9a-f]+)$/;
const INSTALL_PATH_RE = /^\/instalar\/(lmcp_[0-9a-f]+)$/;
const REGISTER_API_PATH = "/api/register";
const MAX_BODY_BYTES = 16 * 1024;

function jsonResponse(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) reject(new Error("body_too_large"));
    });
    req.on("end", () => {
      try {
        resolveBody(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("invalid_json"));
      }
    });
    req.on("error", reject);
  });
}

function cleanRegistration(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function createRegistrationDb() {
  if (!process.env.DATABASE_URL) return null;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, ssl: { rejectUnauthorized: false } });
  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id BIGSERIAL PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      whatsapp TEXT NOT NULL,
      company TEXT NOT NULL,
      consent_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  return { pool, ready };
}

async function registerUser(req, res, tokensFile, db) {
  if (!db) {
    jsonResponse(res, 503, { error: "registration_unavailable" });
    return;
  }
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    jsonResponse(res, err.message === "body_too_large" ? 413 : 400, { error: err.message });
    return;
  }

  const tokenFromForm = cleanRegistration(body.token, 40);
  const name = cleanRegistration(body.name, 120);
  const email = cleanRegistration(body.email, 254).toLowerCase();
  const whatsapp = cleanRegistration(body.whatsapp, 40);
  const company = cleanRegistration(body.company, 160);
  if ((tokenFromForm && !/^lmcp_[0-9a-f]+$/.test(tokenFromForm)) || name.length < 2 || !email || !/^\([0-9]{2}\) [0-9]{5}-[0-9]{4}$/.test(whatsapp) || company.length < 2 || body.consent !== true) {
    jsonResponse(res, 422, { error: "invalid_registration" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    jsonResponse(res, 422, { error: "invalid_email" });
    return;
  }

  let rawToken = tokenFromForm;
  if (!rawToken) {
    rawToken = generateToken();
    const tokenData = loadTokens(tokensFile);
    tokenData.tokens.push({
      name: `cadastro-${Date.now()}`,
      hash: hashToken(rawToken),
      createdAt: new Date().toISOString(),
      revokedAt: null,
      note: "gerado no cadastro público",
    });
    saveTokens(tokensFile, tokenData);
  }
  const auth = authenticate({ headers: { authorization: `Bearer ${rawToken}` }, url: "/mcp" }, tokensFile);
  if (!auth) {
    jsonResponse(res, 404, { error: "invalid_token" });
    return;
  }

  const result = await db.pool.query(
    `INSERT INTO registrations (token_hash, name, email, whatsapp, company, consent_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (token_hash) DO NOTHING
     RETURNING id`,
    [hashToken(rawToken), name, email, whatsapp, company]
  );
  if (result.rowCount === 0) {
    jsonResponse(res, 409, { error: "token_already_registered" });
    return;
  }
  const baseUrl = `https://${req.headers.host || "leadership-mcp.campello.me"}`;
  jsonResponse(res, 201, {
    ok: true,
    connectorUrl: `${baseUrl}/mcp/${rawToken}`,
    installations: {
      claude: { label: "Claude web, desktop e mobile", url: `${baseUrl}/mcp/${rawToken}` },
      claudeCode: {
        label: "Claude Code",
        command: `claude mcp add --transport http --scope user leadership ${baseUrl}/mcp --header "Authorization: Bearer ${rawToken}"`,
      },
      otherAssistants: { label: "ChatGPT, Gemini, Grok e Copilot", url: `${baseUrl}/#instalar` },
    },
  });
}

// stdio: usado pelo pacote npm / Claude Desktop. Uma única instância de servidor. Sem tokens
// (não é exposto à rede); telemetria só se LEADERSHIP_MCP_USAGE_LOG for setada explicitamente.
async function startStdio() {
  configureUsage(process.env.LEADERSHIP_MCP_USAGE_LOG);
  const server = createServer({ user: null });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log apenas em stderr — stdout é reservado para o protocolo MCP.
  console.error("Leadership MCP server rodando (stdio).");
}

// HTTP (Streamable HTTP, stateless): usado no deploy do VPS atrás do Caddy. Cada request
// recebe um par server+transport novo e descartável — sem sessão, sem estado compartilhado.
//
// A autenticação vive AQUI (Node), não mais no Caddy — o Caddy virou proxy puro. Isso permite
// aceitar um LOTE de tokens (não uma chave única) e fazer criar/revogar valer na request
// seguinte, sem restart do processo nem tocar no Caddy. `LEADERSHIP_MCP_AUTH=off` desliga a
// checagem (uso registrado como "public") — só para emergência/debug local.
export async function startHttp(port, options = {}) {
  const tokensFile = options.tokensFile ?? process.env.LEADERSHIP_MCP_TOKENS_FILE ?? DEFAULT_TOKENS_FILE;
  const usageFile = options.usageFile ?? process.env.LEADERSHIP_MCP_USAGE_LOG ?? DEFAULT_USAGE_FILE;
  const authDisabled = process.env.LEADERSHIP_MCP_AUTH === "off";
  const registrationDb = createRegistrationDb();
  configureUsage(usageFile);
  if (registrationDb) await registrationDb.ready;

  if (authDisabled) {
    console.error("AVISO: LEADERSHIP_MCP_AUTH=off — /mcp respondendo SEM autenticação (modo aberto).");
  } else if (!hasActiveTokens(tokensFile)) {
    // Fail-closed: sem tokens ativos, toda request a /mcp volta 401 (nunca abre sozinho).
    console.error(
      `AVISO: nenhum token ativo em "${tokensFile}" — todo acesso a /mcp retornará 401 até ` +
        `criar um token (ver server/tokens-cli.js).`
    );
  }

  const httpServer = createHttpServer(async (req, res) => {
    const requestUrl = new URL(req.url || "/", "http://localhost");
    const registrationPath = REGISTER_PATH_RE.exec(requestUrl.pathname);
    const installationPath = INSTALL_PATH_RE.exec(requestUrl.pathname);
    if (req.method === "GET" && installationPath) {
      const file = landingFile("/instalar.html");
      if (file) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(file));
      } else {
        jsonResponse(res, 404, { error: "installation_page_not_found" });
      }
      return;
    }
    if (req.method === "GET" && (registrationPath || requestUrl.pathname === "/cadastro" || requestUrl.pathname === "/cadastro/")) {
      const file = landingFile("/cadastro.html");
      if (file) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(readFileSync(file));
      } else {
        jsonResponse(res, 404, { error: "registration_page_not_found" });
      }
      return;
    }
    if (req.method === "POST" && requestUrl.pathname === REGISTER_API_PATH) {
      try {
        await registerUser(req, res, process.env.LEADERSHIP_MCP_TOKENS_FILE ?? DEFAULT_TOKENS_FILE, registrationDb);
      } catch (err) {
        console.error("Erro ao registrar usuário:", err);
        if (!res.headersSent) jsonResponse(res, 500, { error: "registration_failed" });
      }
      return;
    }

    // Landing e assets são públicos; o gate de token vale somente para o conector MCP.
    if (serveLanding(req, res)) return;

    // Healthcheck simples para o Docker/Railway (não faz parte do protocolo MCP) — sempre aberto.
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    const isMcpPath = req.url === "/mcp" || PATH_TOKEN_RE.test(req.url || "");
    if (req.url !== "/" && !isMcpPath) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32601, message: "Not found" }, id: null }));
      return;
    }

    // Gate de auth antes do transport. `authenticate` lê o token do header OU do path — por
    // isso roda antes da reescrita de URL abaixo. "/" também entra no gate (o conector não usa
    // "/", mas é a mesma superfície MCP).
    let user = "public";
    if (!authDisabled) {
      const auth = authenticate(req, tokensFile);
      if (!auth) {
        res.writeHead(401, {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Bearer realm="leadership-mcp"',
        });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null }));
        return;
      }
      user = auth.user;
    }

    // Reescreve /mcp/<token>(/...) → /mcp antes de handleRequest — o transport stateless não
    // roteia por path, então isso é seguro e mantém o resto do handler olhando só para /mcp.
    if (req.url !== "/" && req.url !== "/mcp") {
      req.url = "/mcp";
    }

    try {
      const server = createServer({ user });
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

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      console.error(`Leadership MCP server rodando (HTTP) na porta ${port}.`);
      resolve(httpServer);
    });
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
