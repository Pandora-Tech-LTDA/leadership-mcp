---
name: criar-acesso
description: Cria o acesso de uma pessoa ao conector Leadership MCP — pede nome, e-mail e WhatsApp, gera o token, registra no VPS, guarda o contato no registro privado e retorna a URL pronta para enviar. Use quando o Mario pedir para "criar acesso", "gerar token/chave/URL para alguém" ou "cadastrar usuário" do Leadership MCP.
---

# Criar acesso ao Leadership MCP

Cria um token de acesso individual ao conector `/mcp` para uma pessoa e guarda os dados
dela no registro privado. Todo o trabalho pesado é do script `server/onboard-cli.js` —
esta skill só coleta os dados, roda o script e entrega o resultado.

## Passo 1 — Coletar os dados da pessoa

São obrigatórios **nome completo**, **e-mail** e **WhatsApp**. Se algum não veio no
pedido, pergunte com AskUserQuestion (ou diretamente) antes de rodar qualquer comando —
não invente nem deixe em branco. Campo opcional: uma **nota** de contexto (ex.: empresa,
turma, parceiro que indicou).

Validação rápida antes de rodar: e-mail com `@` e domínio; WhatsApp com DDI+DDD
(ex.: `+55 11 91234-5678`). O script também valida e falha com mensagem clara.

## Passo 2 — Rodar o script

```sh
cd server
node onboard-cli.js --nome "Fulana de Tal" --email fulana@ex.com --whatsapp "+55 11 91234-5678" [--nota "contexto"]
```

O script, nesta ordem: gera o token (`lmcp_` + 16 hex), registra **só o hash** no
`tokens.json` do VPS via SSH (mesmo fluxo do `deploy/tokens-remote.sh` — vale na request
seguinte, sem restart), verifica com uma chamada real (token → 200; sem chave → 401),
e só então grava o contato em `server/data/usuarios.jsonl`.

Casos especiais:

- **Sem SSH para o VPS neste ambiente** (ex.: Claude Code web/remoto): o script falha em
  "falha ao registrar no VPS via SSH". Não use `--local` como contorno — ele registra num
  `tokens.json` local que o VPS nunca vê. Em vez disso, monte o comando completo e entregue
  ao Mario para rodar na máquina dele (onde o alias SSH `Pandora-hostinger` existe).
- **Nome de token duplicado** (duas pessoas com mesmo nome): rode de novo com
  `--token-name <slug-alternativo>` (ex.: `fulana-tal-empresa`).
- **`--local`** existe só para teste/self-hosted (registra em `LEADERSHIP_MCP_TOKENS_FILE`,
  default `./data/tokens.json`, e pula a verificação HTTP).

## Passo 3 — Entregar o resultado

Repasse ao Mario, do stdout do script: a **URL do conector** (`/mcp/<token>`), o comando
**`claude mcp add`** (via header Bearer) e a **mensagem pronta de WhatsApp**. Lembre que a
distribuição combinada é via WhatsApp.

## Regras de privacidade (não negociar)

- `server/data/usuarios.jsonl` guarda nome, e-mail, WhatsApp e a URL com o token em claro.
  É **PRIVADO e gitignorado** (`server/data/`) — **nunca** commitar, colar em issue pública
  ou mover para o repo público. Backup vive no repo privado `leadership-mcp-ops`.
- No `tokens.json` do VPS entram só o hash e o nome do token — nunca o contato da pessoa.
- Nunca reaproveitar token entre pessoas. Para cortar um acesso:
  `./server/deploy/tokens-remote.sh revoke <token-name>` (vale na hora).
