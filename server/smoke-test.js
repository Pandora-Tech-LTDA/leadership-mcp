// smoke-test.js — valida classificação e montagem da orientação sem subir o transporte MCP.
// Roda 100% offline: força o loader a ignorar o GitHub raw (senão os sinais viriam da base
// publicada na main, não da cópia local em teste). Uso: node smoke-test.js

process.env.LEADERSHIP_MCP_REPO = "offline/offline";

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { classify, buildGuidance, MIN_ACTIVATION_SCORE, createServer, INSTRUCTIONS, startHttp } = await import(
  "./index.js"
);
const { CASES } = await import("./eval-cases.js");
const { generateToken, hashToken, loadTokens, saveTokens, authenticate, hasActiveTokens } = await import("./auth.js");
const { logUsage, configureUsage } = await import("./usage.js");

let pass = 0;
let fail = 0;

console.log("== Classificação ==\n");
for (const [situacao, esperado] of CASES) {
  const scored = await classify(situacao);
  const top = scored[0];
  const got = top && top.score >= MIN_ACTIVATION_SCORE ? top.trigger.id : null;
  const accepted = esperado === null ? [null] : Array.isArray(esperado) ? esperado : [esperado];
  const ok = accepted.includes(got);
  console.log(
    `${ok ? "✅" : "❌"} "${situacao}"\n   → ${got ?? "(nenhum gatilho)"} (score ${top?.score ?? 0}); esperado: ${accepted.map((a) => a ?? "(nenhum gatilho)").join(" ou ")}`
  );
  if (ok) pass++;
  else fail++;
}

console.log(`\nResultado: ${pass}/${CASES.length} ok, ${fail} falha(s).\n`);

console.log("== Orientação consolidada (2 exemplos) ==\n");
for (const situacao of [
  "como respondo o email agressivo do colega",
  "briguei com meu irmão por causa da herança e não nos falamos há um mês",
]) {
  const guidance = await buildGuidance(situacao);
  console.log(`--- "${situacao}"\n${guidance.text}\n`);
  // A orientação precisa sair completa: gatilho + pelo menos um filtro, uma ação e o resultado.
  for (const marker of ["## Gatilho identificado", "### Filtro —", "### Ação sugerida —", "### Resultado esperado —"]) {
    if (!guidance.text.includes(marker)) {
      console.error(`❌ Orientação incompleta: faltou a seção "${marker}"`);
      fail++;
    }
  }
  if (!guidance.gatilho) {
    console.error(`❌ buildGuidance() não retornou o id do gatilho classificado`);
    fail++;
  }
}

// Servidor MCP: instancia sem erro e entrega o gatilho embutido via `instructions`.
console.log("\n== Servidor MCP (instructions embutido) ==\n");
try {
  createServer();
  const okInstr =
    typeof INSTRUCTIONS === "string" &&
    INSTRUCTIONS.trim().length > 0 &&
    INSTRUCTIONS.includes("buscar_orientacao");
  console.log(`${okInstr ? "✅" : "❌"} createServer() instancia e INSTRUCTIONS cita buscar_orientacao`);
  if (!okInstr) fail++;
} catch (err) {
  console.log(`❌ createServer() lançou: ${err.message}`);
  fail++;
}

// ---------------------------------------------------------------------------
// Auth (server/auth.js): fail-closed, header, path, revogação, reload por mtime.
// ---------------------------------------------------------------------------
console.log("\n== Auth (server/auth.js) ==\n");
{
  const check = (ok, label) => {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) fail++;
  };

  const dir = mkdtempSync(join(tmpdir(), "lmcp-auth-"));
  const tokensFile = join(dir, "tokens.json");

  check(hasActiveTokens(tokensFile) === false, "fail-closed: sem tokens.json, hasActiveTokens() === false");
  check(authenticate({ headers: {}, url: "/mcp" }, tokensFile) === null, "fail-closed: nenhuma request autentica sem tokens.json");

  const tokenA = generateToken();
  const tokenB = generateToken();
  const tokenC = generateToken();
  saveTokens(tokensFile, {
    tokens: [
      { name: "tA", hash: hashToken(tokenA), createdAt: new Date().toISOString(), revokedAt: null, note: "" },
      { name: "tB", hash: hashToken(tokenB), createdAt: new Date().toISOString(), revokedAt: null, note: "" },
      { name: "tC", hash: hashToken(tokenC), createdAt: new Date().toISOString(), revokedAt: null, note: "" },
    ],
  });

  const viaHeader = authenticate({ headers: { authorization: `Bearer ${tokenA}` }, url: "/mcp" }, tokensFile);
  check(viaHeader?.user === "tA", 'token válido no header "Authorization: Bearer" autentica como "tA"');

  const viaPath = authenticate({ headers: {}, url: `/mcp/${tokenB}` }, tokensFile);
  check(viaPath?.user === "tB", 'token válido embutido em "/mcp/<token>" autentica como "tB"');

  const invalid = authenticate({ headers: { authorization: "Bearer lmcp_0000000000000000" }, url: "/mcp" }, tokensFile);
  check(invalid === null, "token inexistente não autentica");

  // Revoga tC e confirma que o reload (por mtime/size, sem restart) enxerga a mudança.
  const beforeRevoke = authenticate({ headers: { authorization: `Bearer ${tokenC}` }, url: "/mcp" }, tokensFile);
  check(beforeRevoke?.user === "tC", "tC autentica antes de ser revogado");

  const data = loadTokens(tokensFile);
  data.tokens.find((t) => t.name === "tC").revokedAt = new Date().toISOString();
  saveTokens(tokensFile, data);

  const afterRevoke = authenticate({ headers: { authorization: `Bearer ${tokenC}` }, url: "/mcp" }, tokensFile);
  check(afterRevoke === null, "tC deixa de autenticar após revogação (reload por mtime, sem restart)");
  check(hasActiveTokens(tokensFile) === true, "hasActiveTokens() === true com tA/tB ainda ativos");
}

// ---------------------------------------------------------------------------
// Usage (server/usage.js): grava JSONL, nunca lança, nunca configurado vira no-op.
// ---------------------------------------------------------------------------
console.log("\n== Usage (server/usage.js) ==\n");
{
  const dir = mkdtempSync(join(tmpdir(), "lmcp-usage-"));
  const usageFile = join(dir, "usage.jsonl");

  configureUsage(undefined);
  logUsage({ user: "tA", tool: "buscar_orientacao", gatilho: "conflito", durationMs: 5 });
  console.log("✅ logUsage() sem configureUsage() não lança (no-op)");

  configureUsage(usageFile);
  logUsage({ user: "tA", tool: "buscar_orientacao", gatilho: "conflito", durationMs: 12 });
  await new Promise((r) => setTimeout(r, 50));
  const line = readFileSync(usageFile, "utf8").trim();
  const parsed = JSON.parse(line);
  const okFields = parsed.user === "tA" && parsed.tool === "buscar_orientacao" && parsed.gatilho === "conflito";
  console.log(`${okFields ? "✅" : "❌"} logUsage() grava linha JSONL com user/tool/gatilho`);
  if (!okFields) fail++;
  configureUsage(undefined);
}

// ---------------------------------------------------------------------------
// E2E HTTP (startHttp): gate de auth completo + telemetria fim a fim, sem tocar na rede.
// ---------------------------------------------------------------------------
console.log("\n== HTTP e2e (auth + telemetria) ==\n");
{
  const check = (ok, label) => {
    console.log(`${ok ? "✅" : "❌"} ${label}`);
    if (!ok) fail++;
  };

  const dir = mkdtempSync(join(tmpdir(), "lmcp-http-"));
  const tokensFile = join(dir, "tokens.json");
  const usageFile = join(dir, "usage.jsonl");
  const token = generateToken();
  saveTokens(tokensFile, {
    tokens: [{ name: "e2e-user", hash: hashToken(token), createdAt: new Date().toISOString(), revokedAt: null, note: "" }],
  });

  const httpServer = await startHttp(0, { tokensFile, usageFile });
  const port = httpServer.address().port;
  const base = `http://127.0.0.1:${port}`;
  const situacaoSecreta = "briguei com meu irmao por causa da heranca marcador-unico-9f3c";

  const callTool = (path, headers = {}) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...headers,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "buscar_orientacao", arguments: { situacao: situacaoSecreta } },
      }),
    });

  try {
    const semAuth = await callTool("/mcp");
    check(semAuth.status === 401, "sem chave → 401");
    check(semAuth.headers.get("www-authenticate") === 'Bearer realm="leadership-mcp"', "401 inclui WWW-Authenticate");

    const comBearer = await callTool("/mcp", { Authorization: `Bearer ${token}` });
    check(comBearer.status === 200, "Bearer válido → 200");

    const comPath = await callTool(`/mcp/${token}`);
    check(comPath.status === 200, "token embutido em /mcp/<token> → 200");

    await new Promise((r) => setTimeout(r, 100));
    const usageLines = readFileSync(usageFile, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    check(usageLines.length === 2, "usage.jsonl recebeu uma linha por chamada autenticada (Bearer + path)");
    check(
      usageLines.every((l) => l.user === "e2e-user" && l.tool === "buscar_orientacao" && l.gatilho),
      'todas as linhas de uso têm user "e2e-user", tool e gatilho preenchidos'
    );
    const usageRaw = readFileSync(usageFile, "utf8");
    check(!usageRaw.includes(situacaoSecreta), "usage.jsonl NUNCA contém o texto da situação");
  } finally {
    httpServer.close();
  }
}

console.log(`\nTotal de falhas: ${fail}.\n`);
process.exit(fail === 0 ? 0 : 1);
