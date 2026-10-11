// consultations.js — caixa local para revisão e melhoria do MCP.
// Diferente da telemetria agregada, este log preserva a situação consultada.
// Só escreve quando um caminho é configurado; falhas nunca derrubam a resposta.

import { createWriteStream, mkdirSync } from "node:fs";
import { dirname } from "node:path";

let stream = null;
let streamPath = null;
let consultationsFile = null;

export function configureConsultations(path) {
  consultationsFile = path || null;
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

// Registra a entrada necessária para revisão humana: contexto, classificação e resposta.
// Não registra a orientação completa para evitar duplicação; ela pode ser reconstruída pela versão da base.
export function logConsultation({ user, situacao, gatilho, durationMs, knowledgeRef = null }) {
  if (!consultationsFile) return;
  try {
    const line =
      JSON.stringify({
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ts: new Date().toISOString(),
        status: "new",
        user: user || "public",
        tool: "buscar_orientacao",
        situacao,
        gatilho: gatilho ?? null,
        durationMs,
        knowledgeRef,
      }) + "\n";
    const s = getStream(consultationsFile);
    if (s) s.write(line, () => {});
  } catch {
    // A caixa de melhoria nunca pode derrubar a resposta ao cliente.
  }
}
