#!/usr/bin/env node
// onboard-cli.js — cria o acesso de UMA pessoa ao conector /mcp em um passo só:
// gera o token, registra o hash no tokens.json (no VPS via SSH, ou local com --local),
// guarda os dados da pessoa em data/usuarios.jsonl (PRIVADO, gitignorado) e imprime a
// URL do conector pronta para enviar por WhatsApp.
//
// Uso:
//   node onboard-cli.js --nome "Fulana de Tal" --email fulana@ex.com --whatsapp "+55 11 91234-5678"
//                       [--nota "contexto"] [--token-name <slug>] [--local]
//
// Por padrão registra no VPS via SSH (mesmos defaults de deploy/tokens-remote.sh) e
// verifica com uma chamada initialize real (token → 200; sem chave → 401, fail-closed).
// Com --local, registra no tokens.json local (LEADERSHIP_MCP_TOKENS_FILE) — para testes
// ou instalações self-hosted.
//
// Dados pessoais (nome/e-mail/WhatsApp) ficam SÓ no registro local (data/usuarios.jsonl,
// gitignorado — backup no repo privado leadership-mcp-ops). No tokens.json do VPS vai
// apenas o hash e o nome do token, nunca o contato.
//
// Config (override por env var):
//   SSH_HOST                     host SSH do VPS            (default: Pandora-hostinger)
//   COMPOSE_DIR                  dir do docker-compose      (default: /root/leadership-mcp/deploy)
//   SVC                          serviço no compose         (default: leadership-mcp)
//   LEADERSHIP_MCP_URL           base do conector           (default: https://leadership-mcp.campello.me/mcp)
//   LEADERSHIP_MCP_TOKENS_FILE   tokens.json (só --local)   (default: ./data/tokens.json)
//   LEADERSHIP_MCP_USERS_FILE    registro de pessoas        (default: ./data/usuarios.jsonl)

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { generateToken, hashToken, loadTokens, saveTokens } from "./auth.js";

const SSH_HOST = process.env.SSH_HOST || "Pandora-hostinger";
const COMPOSE_DIR = process.env.COMPOSE_DIR || "/root/leadership-mcp/deploy";
const SVC = process.env.SVC || "leadership-mcp";
const MCP_URL = process.env.LEADERSHIP_MCP_URL || "https://leadership-mcp.campello.me/mcp";
const TOKENS_FILE = process.env.LEADERSHIP_MCP_TOKENS_FILE || "./data/tokens.json";
const USERS_FILE = process.env.LEADERSHIP_MCP_USERS_FILE || "./data/usuarios.jsonl";

function usage(msg) {
  if (msg) console.error(`erro: ${msg}\n`);
  console.error(
    'Uso: node onboard-cli.js --nome "Fulana de Tal" --email fulana@ex.com --whatsapp "+55 11 91234-5678"\n' +
      '                         [--nota "contexto"] [--token-name <slug>] [--local]'
  );
  process.exit(1);
}

function parseArgs(argv) {
  const args = { local: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--local") args.local = true;
    else if (a === "--nome") args.nome = argv[++i];
    else if (a === "--email") args.email = argv[++i];
    else if (a === "--whatsapp") args.whatsapp = argv[++i];
    else if (a === "--nota") args.nota = argv[++i];
    else if (a === "--token-name") args.tokenName = argv[++i];
    else usage(`argumento desconhecido: ${a}`);
  }
  return args;
}

function slugify(nome) {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadUsers(file) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Registra o hash no tokens.json do VPS rodando um snippet node dentro do contêiner via SSH.
// O token em claro nunca sai desta máquina — só o hash viaja.
function registerRemote(entry) {
  const snippet = `
const fs = require("fs");
const f = process.env.LEADERSHIP_MCP_TOKENS_FILE || "./data/tokens.json";
let d = { tokens: [] };
try { d = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
if (!Array.isArray(d.tokens)) d.tokens = [];
const entry = ${JSON.stringify(entry)};
if (d.tokens.some((t) => t.name === entry.name)) {
  console.error('erro: já existe um token com o nome "' + entry.name + '" no VPS');
  process.exit(2);
}
d.tokens.push(entry);
const tmp = f + ".tmp-onboard";
fs.writeFileSync(tmp, JSON.stringify(d, null, 2) + "\\n");
fs.renameSync(tmp, f);
console.log("ok");
`;
  const res = spawnSync(
    "ssh",
    [SSH_HOST, `cd '${COMPOSE_DIR}' && docker compose exec -T '${SVC}' node`],
    { input: snippet, encoding: "utf8" }
  );
  if (res.error || res.status !== 0 || !(res.stdout || "").includes("ok")) {
    const detail = res.error ? res.error.message : (res.stderr || res.stdout || "").trim();
    throw new Error(
      `falha ao registrar no VPS via SSH (${SSH_HOST}): ${detail || `exit ${res.status}`}`
    );
  }
}

function registerLocal(entry) {
  const data = loadTokens(TOKENS_FILE);
  if (data.tokens.some((t) => t.name === entry.name)) {
    throw new Error(`já existe um token com o nome "${entry.name}" em ${TOKENS_FILE}`);
  }
  data.tokens.push(entry);
  saveTokens(TOKENS_FILE, data);
}

// Chamada initialize real contra o endpoint — ecoa só o status HTTP.
async function probe(token) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "onboard-cli", version: "1.0" },
      },
    }),
  });
  await res.body?.cancel();
  return res.status;
}

const args = parseArgs(process.argv.slice(2));
if (!args.nome) usage("--nome é obrigatório");
if (!args.email) usage("--email é obrigatório");
if (!args.whatsapp) usage("--whatsapp é obrigatório");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) usage(`e-mail inválido: ${args.email}`);
if (!/\d{8,}/.test(args.whatsapp.replace(/\D/g, ""))) usage(`WhatsApp inválido: ${args.whatsapp}`);

const tokenName = args.tokenName || slugify(args.nome);
if (!tokenName) usage(`não consegui derivar um nome de token de "${args.nome}" — use --token-name`);

const users = loadUsers(USERS_FILE);
if (users.some((u) => u.email === args.email)) {
  console.error(`aviso: já existe registro com o e-mail ${args.email} em ${USERS_FILE} — criando mesmo assim.`);
}
if (users.some((u) => u.tokenName === tokenName)) {
  usage(`já existe registro com o token "${tokenName}" em ${USERS_FILE} — use --token-name para diferenciar`);
}

const token = generateToken();
const entry = {
  name: tokenName,
  hash: hashToken(token),
  createdAt: new Date().toISOString(),
  revokedAt: null,
  note: args.nota || "onboard-cli",
};

if (args.local) {
  registerLocal(entry);
  console.error(`Token registrado em ${TOKENS_FILE} (modo local).`);
} else {
  console.error(`Registrando no VPS (${SSH_HOST})...`);
  registerRemote(entry);
  const [codeToken, codeNoAuth] = [await probe(token), await probe("")];
  console.error(`  token novo → HTTP ${codeToken}   (esperado 200)`);
  console.error(`  sem chave  → HTTP ${codeNoAuth}   (esperado 401 — fail-closed intacto)`);
  if (codeToken !== 200) {
    console.error("erro: o token novo não abriu 200 — verifique o VPS antes de distribuir.");
    process.exit(1);
  }
}

// Só depois do token estar registrado com sucesso o contato entra no registro local.
const record = {
  ts: new Date().toISOString(),
  nome: args.nome,
  email: args.email,
  whatsapp: args.whatsapp,
  tokenName,
  url: `${MCP_URL}/${token}`,
  ...(args.nota ? { nota: args.nota } : {}),
};
mkdirSync(dirname(USERS_FILE), { recursive: true });
appendFileSync(USERS_FILE, JSON.stringify(record) + "\n");
console.error(`Registro salvo em ${USERS_FILE} (PRIVADO — não commitar; backup no leadership-mcp-ops).\n`);

const primeiroNome = args.nome.trim().split(/\s+/)[0];
console.log(`Acesso criado: ${args.nome} (token "${tokenName}")`);
console.log(`\nURL do conector (claude.ai web/desktop/mobile):\n${MCP_URL}/${token}`);
console.log(
  `\nClaude Code:\nclaude mcp add --transport http --scope user leadership ${MCP_URL} \\\n` +
    `  --header "Authorization: Bearer ${token}"`
);
console.log(
  `\nMensagem pronta para o WhatsApp (${args.whatsapp}):\n---\n` +
    `Oi, ${primeiroNome}! Aqui está seu acesso pessoal ao Leadership MCP:\n\n` +
    `${MCP_URL}/${token}\n\n` +
    `No claude.ai (web, desktop ou celular): Configurações → Conectores → Adicionar conector ` +
    `personalizado → cole a URL acima (não precisa de OAuth). Qualquer coisa, me chama!\n---`
);
