// smoke-test.js — valida classificação e montagem da orientação sem subir o transporte MCP.
// Roda 100% offline: força o loader a ignorar o GitHub raw (senão os sinais viriam da base
// publicada na main, não da cópia local em teste). Uso: node smoke-test.js

process.env.LEADERSHIP_MCP_REPO = "offline/offline";

const { classify, buildGuidance, MIN_ACTIVATION_SCORE, createServer, INSTRUCTIONS } = await import("./index.js");
const { CASES } = await import("./eval-cases.js");

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
  console.log(`--- "${situacao}"\n${guidance}\n`);
  // A orientação precisa sair completa: gatilho + pelo menos um filtro, uma ação e o resultado.
  for (const marker of ["## Gatilho identificado", "### Filtro —", "### Ação sugerida —", "### Resultado esperado —"]) {
    if (!guidance.includes(marker)) {
      console.error(`❌ Orientação incompleta: faltou a seção "${marker}"`);
      fail++;
    }
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

process.exit(fail === 0 ? 0 : 1);
