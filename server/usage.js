// usage.js — telemetria mínima de uso (JSONL), só para medir a North Star (usuários ativos
// semanais). Fire-and-forget: nunca lança, nunca atrasa a resposta ao cliente, e NUNCA grava o
// texto da situação (só metadados). Sem path configurado (usageFile falsy) vira no-op.

import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

let stream = null;
let streamPath = null;

// Caminho ativo do log — configurado uma vez no boot (startHttp/startStdio). Sem chamada a
// configureUsage(), logUsage() é no-op (é o caso do stdio sem LEADERSHIP_MCP_USAGE_LOG).
let usageFile = null;

export function configureUsage(path) {
  usageFile = path || null;
}

function getStream(path) {
  if (stream && streamPath === path) return stream;
  if (stream) stream.end();
  try {
    mkdirSync(dirname(path), { recursive: true });
    stream = createWriteStream(path, { flags: "a" });
    streamPath = path;
  } catch {
    stream = null;
    streamPath = null;
  }
  return stream;
}

// logUsage({user, tool, gatilho, durationMs}) — grava uma linha JSONL no caminho configurado.
// `gatilho` é o id classificado (ou null); nunca inclui a situação em texto livre.
export function logUsage({ user, tool, gatilho, durationMs }) {
  if (!usageFile) return;
  try {
    const line =
      JSON.stringify({
        ts: new Date().toISOString(),
        user: user || "public",
        tool,
        gatilho: gatilho ?? null,
        durationMs,
      }) + "\n";
    const s = getStream(usageFile);
    if (s) s.write(line, () => {});
  } catch {
    // Telemetria nunca pode derrubar a resposta ao cliente.
  }
}
