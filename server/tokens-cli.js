#!/usr/bin/env node
// tokens-cli.js — gerencia o lote de tokens de acesso ao endpoint HTTP (/mcp).
//
// Uso:
//   node tokens-cli.js create <nome> [nota]
//   node tokens-cli.js list
//   node tokens-cli.js revoke <nome>
//   node tokens-cli.js create-batch <n> [--md <path>]
//
// tokens.json guarda só hashes (LEADERSHIP_MCP_TOKENS_FILE, default ./data/tokens.json) — o
// token em claro só existe na saída deste comando e no MD de distribuição (repo privado).

import { writeFileSync } from "node:fs";
import { generateToken, hashToken, loadTokens, saveTokens } from "./auth.js";

const TOKENS_FILE = process.env.LEADERSHIP_MCP_TOKENS_FILE || "./data/tokens.json";
const MCP_URL = process.env.LEADERSHIP_MCP_URL || "https://leadership-mcp.campello.me/mcp";

function nowIso() {
  return new Date().toISOString();
}

function claudeCodeCmd(token) {
  return (
    `claude mcp add --transport http --scope user leadership ${MCP_URL} \\\n` +
    `  --header "Authorization: Bearer ${token}"`
  );
}

function cmdCreate(name, note = "") {
  if (!name) {
    console.error("Uso: node tokens-cli.js create <nome> [nota]");
    process.exit(1);
  }
  const data = loadTokens(TOKENS_FILE);
  if (data.tokens.some((t) => t.name === name)) {
    console.error(`erro: já existe um token com o nome "${name}"`);
    process.exit(1);
  }

  const token = generateToken();
  data.tokens.push({ name, hash: hashToken(token), createdAt: nowIso(), revokedAt: null, note });
  saveTokens(TOKENS_FILE, data);

  console.log(`Token criado: ${name}`);
  console.log(token);
  console.log(`\nConector claude.ai (web/desktop/mobile): ${MCP_URL}/${token}`);
  console.log(`\nClaude Code:\n${claudeCodeCmd(token)}`);
}

function cmdList() {
  const data = loadTokens(TOKENS_FILE);
  if (data.tokens.length === 0) {
    console.log("(nenhum token cadastrado)");
    return;
  }
  for (const t of data.tokens) {
    const status = t.revokedAt ? `revogado em ${t.revokedAt}` : "ativo";
    console.log(`${t.name}\t${status}\tcriado em ${t.createdAt}${t.note ? `\t${t.note}` : ""}`);
  }
}

function cmdRevoke(name) {
  if (!name) {
    console.error("Uso: node tokens-cli.js revoke <nome>");
    process.exit(1);
  }
  const data = loadTokens(TOKENS_FILE);
  const entry = data.tokens.find((t) => t.name === name);
  if (!entry) {
    console.error(`erro: token "${name}" não encontrado`);
    process.exit(1);
  }
  if (entry.revokedAt) {
    console.log(`Token "${name}" já estava revogado em ${entry.revokedAt}.`);
    return;
  }
  entry.revokedAt = nowIso();
  saveTokens(TOKENS_FILE, data);
  console.log(`Token "${name}" revogado.`);
}

function cmdCreateBatch(nArg, mdPath) {
  const count = Number(nArg);
  if (!Number.isInteger(count) || count <= 0) {
    console.error("Uso: node tokens-cli.js create-batch <n> [--md <path>]");
    process.exit(1);
  }

  const data = loadTokens(TOKENS_FILE);
  const pad = Math.max(3, String(count).length);
  const rows = [];

  for (let i = 1; i <= count; i++) {
    const name = `t${String(i).padStart(pad, "0")}`;
    if (data.tokens.some((t) => t.name === name)) {
      console.error(`erro: já existe um token com o nome "${name}" — apague/renomeie antes de gerar o lote`);
      process.exit(1);
    }
    const token = generateToken();
    data.tokens.push({ name, hash: hashToken(token), createdAt: nowIso(), revokedAt: null, note: "" });
    rows.push({ name, token });
  }
  saveTokens(TOKENS_FILE, data);

  const outPath = mdPath || "./data/distribuicao-tokens.md";
  const lines = [
    "# PRIVADO — não commitar no repo público",
    "",
    `Gerado em ${nowIso()}. Lote de ${count} tokens para o conector leadership-mcp.`,
    "",
    "| # | Nome | Token | URL do conector | Entregue a | Data |",
    "|---|------|-------|------------------|------------|------|",
    ...rows.map((r, i) => `| ${i + 1} | ${r.name} | \`${r.token}\` | ${MCP_URL}/${r.token} | | |`),
    "",
    "## Claude Code (header Authorization: Bearer)",
    "",
    "```sh",
    claudeCodeCmd("<TOKEN>"),
    "```",
    "",
    "## Conector claude.ai (web/desktop/mobile)",
    "",
    'Cole a URL da coluna "URL do conector" em Configurações → Conectores → Adicionar conector',
    "personalizado (sem OAuth ID/secret).",
    "",
  ];
  writeFileSync(outPath, lines.join("\n"));

  console.log(`${count} tokens criados em ${TOKENS_FILE}.`);
  console.log(`MD de distribuição: ${outPath}`);
}

function usage() {
  console.error(
    [
      "Uso:",
      "  node tokens-cli.js create <nome> [nota]",
      "  node tokens-cli.js list",
      "  node tokens-cli.js revoke <nome>",
      "  node tokens-cli.js create-batch <n> [--md <path>]",
    ].join("\n")
  );
  process.exit(1);
}

const [, , cmd, ...args] = process.argv;

switch (cmd) {
  case "create":
    cmdCreate(args[0], args.slice(1).join(" "));
    break;
  case "list":
    cmdList();
    break;
  case "revoke":
    cmdRevoke(args[0]);
    break;
  case "create-batch": {
    const mdIdx = args.indexOf("--md");
    const mdPath = mdIdx >= 0 ? args[mdIdx + 1] : undefined;
    cmdCreateBatch(args[0], mdPath);
    break;
  }
  default:
    usage();
}
