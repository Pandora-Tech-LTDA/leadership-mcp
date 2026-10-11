import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
process.env.LEADERSHIP_MCP_REPO = 'offline/offline';
const { createServer } = await import('./index.js');
const server = createServer({user: 'synthetic-contract-test'});
const client = new Client({name:'contract-test',version:'1'});
const [a,b] = InMemoryTransport.createLinkedPair();
await server.connect(a);
await client.connect(b);
try {
 const {tools} = await client.listTools();
 const tool = tools.find(t=>t.name==='buscar_orientacao');
 for(const phrase of ['qualidade das entregas','respostas curtas','somente após retorno bem-sucedido']) assert.ok(tool.description.includes(phrase));
 const result = await client.callTool({name:tool.name,arguments:{situacao:'Preciso dar feedback sobre qualidade das entregas de um liderado.'}});
 assert.ok(!result.isError);
 const text = result.content.map(c=>c.text||'').join('\n');
 assert.ok(text.includes('Consulta realizada ao Leadership MCP'));
 assert.ok(text.includes('Consultei o Leadership MCP.'));
 assert.ok(text.includes('### Ação sugerida'));
 console.log('PASS: MCP initialize, tools/list contextual triggers, tools/call guidance and consultation receipt');
} finally { await client.close(); await server.close(); }
