// auth.js — autenticação por token do endpoint HTTP (/mcp).
//
// Tokens ficam em um JSON (tokens.json) guardando só o HASH SHA-256 — o token em claro só
// existe no MD de distribuição (repo privado) e na mão de quem o recebeu. O arquivo é recarregado
// por mtime+size a cada request, então revogar/criar um token vale na request seguinte, sem
// restart do processo.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, renameSync, statSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function generateToken() {
  return "lmcp_" + randomBytes(8).toString("hex");
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// Path do token embutido na URL: /mcp/<token> ou /mcp/<token>/qualquer-coisa.
export const PATH_TOKEN_RE = /^\/mcp\/(lmcp_[0-9a-f]+)(\/.*)?$/;

const cache = new Map(); // arquivo → { mtimeMs, size, data }

// Lê tokens.json com cache por mtime/size — evita reler a cada request, mas nunca serve
// dado desatualizado: qualquer escrita (criar/revogar) muda o mtime e invalida o cache.
export function loadTokens(file) {
  let stat;
  try {
    stat = statSync(file);
  } catch {
    return { tokens: [] };
  }

  const cached = cache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size) {
    return cached.data;
  }

  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    data = { tokens: [] };
  }
  if (!Array.isArray(data.tokens)) data.tokens = [];

  cache.set(file, { mtimeMs: stat.mtimeMs, size: stat.size, data });
  return data;
}

// Escrita atômica (tmp + rename) — evita tokens.json corrompido se o processo morrer no meio.
export function saveTokens(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  renameSync(tmp, file);
  cache.delete(file);
}

// Existe ao menos um token não revogado? Usado no boot para o aviso de fail-closed.
export function hasActiveTokens(file) {
  const data = loadTokens(file);
  return data.tokens.some((t) => !t.revokedAt);
}

// Extrai o token da request: header `Authorization: Bearer <token>` OU `/mcp/<token>` na URL.
export function extractToken(req) {
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token) return token;
  }
  const match = PATH_TOKEN_RE.exec(req.url || "");
  return match ? match[1] : null;
}

// Autentica a request contra o lote de tokens. Retorna {user} (o `name` do token) ou null.
// Comparação por digest com timingSafeEqual — nunca compara o token em claro.
export function authenticate(req, tokensFile) {
  const token = extractToken(req);
  if (!token) return null;

  const digest = Buffer.from(hashToken(token), "hex");
  const { tokens } = loadTokens(tokensFile);

  for (const entry of tokens) {
    if (entry.revokedAt) continue;
    const entryDigest = Buffer.from(entry.hash, "hex");
    if (entryDigest.length === digest.length && timingSafeEqual(entryDigest, digest)) {
      return { user: entry.name };
    }
  }
  return null;
}
