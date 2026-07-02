// smoke-test.js — valida classificação e montagem da orientação sem subir o transporte MCP.
// Usa a base empacotada/local como fonte (não exige rede). Uso: node smoke-test.js

import { classify, buildGuidance, createServer, INSTRUCTIONS } from "./index.js";

// (situação do usuário, gatilho esperado) — frases dos exemplos do prompt v0.3.
const CASES = [
  ["escreve um email para o fornecedor que está atrasando", "interacao-externa"],
  ["como respondo o email agressivo do colega", "conflito"],
  ["roteiro para anunciar cancelamento do projeto para o time", "decisao-com-impacto"],
  ["texto de reconhecimento para o time", "feedback"],
  ["mensagem para pedir ajuda a um colega sem sobrecarregar", "relacionamento"],
  ["como apresento essa decisão impopular para a liderança", "decisao-com-impacto"],
  ["preciso dar um feedback difícil para um liderado", "feedback"],
  ["tem uma conversa difícil que venho adiando com um liderado", "feedback"],
  ["a discussão com o time fica andando em círculos e não chegamos a um acordo", "conflito"],
  ["vou delegar um projeto novo e quero fazer o kickoff com a pessoa", "decisao-com-impacto"],
];

let pass = 0;
let fail = 0;

console.log("== Classificação ==\n");
for (const [situacao, esperado] of CASES) {
  const scored = await classify(situacao);
  const top = scored[0];
  const ok = top && top.trigger.id === esperado && top.score > 0;
  console.log(
    `${ok ? "✅" : "❌"} "${situacao}"\n   → ${top?.trigger.id} (score ${top?.score}); esperado: ${esperado}`
  );
  if (ok) pass++;
  else fail++;
}

console.log(`\nResultado: ${pass}/${CASES.length} ok, ${fail} falha(s).\n`);

console.log("== Orientação consolidada (1 exemplo) ==\n");
const sample = await buildGuidance("como respondo o email agressivo do colega");
console.log(sample);

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

process.exit(fail === 0 ? 0 : 1);
