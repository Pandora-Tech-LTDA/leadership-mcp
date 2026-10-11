# Analytics do Leadership MCP

## Escolha

Usaremos **Umami** como camada de analytics web: open source (MIT), self-hosted, privacy-first, compatível com PostgreSQL e com API/tracker JavaScript simples. Isso permite consultar métricas pelo painel e, depois, integrar o `funnel_check.py` à API sem expor dados pessoais.

A instância pode compartilhar o PostgreSQL do Railway, mas deve usar as próprias tabelas e variáveis do Umami; não misturar credenciais nem consultar as tabelas de cadastro para analytics.

## Integração já preparada

`docs/analytics.js`:

- não inicia coleta sem configuração;
- exige opt-in de métricas do visitante;
- respeita Do Not Track;
- normaliza `/instalar/<token>` para `/instalar`;
- não envia tokens, nomes, emails, WhatsApp, empresa ou texto de conversa;
- guarda UTMs apenas em `localStorage` para atribuição do cadastro já existente;
- envia eventos de funil somente com propriedades curtas e permitidas.

As páginas `index.html`, `cadastro.html` e `instalar.html` já carregam o adaptador. Até a instância Umami ser configurada, ele opera em modo no-op.

## Eventos

- `page_view`
- `analytics_consent`
- `cta_start_click`
- `signup_start`
- `signup_submit`
- `signup_success`
- `install_copy_connector`
- `install_copy_command`

## Ativação

Preencher o bloco de configuração nas três páginas:

```html
<script>
  window.LEADERSHIP_ANALYTICS = {
    host: 'https://analytics.exemplo.com',
    websiteId: 'ID_PUBLICO_DO_SITE'
  };
</script>
```

O `websiteId` não é uma credencial. Chaves administrativas e tokens da API ficam somente nas variáveis seguras do ambiente de execução.

## Próximas etapas técnicas

1. Criar o serviço Umami no Railway, preferencialmente usando PostgreSQL dedicado ou isolamento explícito.
2. Criar o website `leadership-mcp.campello.me` no Umami.
3. Preencher `host` e `websiteId` nas páginas.
4. Validar no navegador que o opt-in envia `page_view` e os eventos acima.
5. Adicionar ao `funnel_check.py` uma leitura agregada da API do Umami, sem trazer dados de visitantes individuais.
6. Criar as colunas UTM que faltam em `registrations` antes de depender da atribuição de campanha no relatório.

Não criar ou publicar metas no painel como se fossem resultado: primeiro validar coleta, consentimento e atribuição.
