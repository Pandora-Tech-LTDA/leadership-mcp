# Sistema visual — Leadership MCP

**Versão:** 1.0  
**Base:** `brand-profile.md`  
**Uso:** Facebook, LinkedIn, GitHub, TabNews e materiais de parceria.  
**Objetivo:** produzir seis formatos consistentes sem redesenhar cada publicação.

> Este é um sistema de layout e produção. A ferramenta de design renderiza os arquivos; o TryPost publica o asset final. O primeiro rascunho tende a ficar cerca de 70–80% on-brand; peças hero ainda precisam de revisão humana.

## 1. BRAND — kit visual

### Cores travadas

| Token | Hex | Uso |
|---|---|---|
| `ink` | `#1c2530` | fundo escuro, títulos e texto de alto contraste |
| `green` | `#2f6f5b` | cor principal, balão/cavalo, CTA |
| `beige` | `#faf8f4` | fundo principal e área de respiro |
| `green-soft` | `#e7f0ec` | cartões, áreas de apoio e fundos alternativos |
| `coral` | `#c65f3f` | ênfase pontual, marcador e linha de atenção |
| `muted` | `#5b6875` | texto secundário |
| `line` | `#e6e3dc` | divisórias discretas |

**Regra:** coral nunca ocupa mais de 10% da área. Verde é a ação/conexão; bege é a clareza; ink é a tensão ou o contraste.

### Tipografia

- **Título:** Arial/Helvetica Neue, ExtraBold, caixa baixa ou sentence case; fallback seguro em qualquer editor.
- **Corpo:** Arial/Helvetica Neue, Regular/Medium.
- **Código/técnico:** fonte monoespaçada do editor.
- **Máximo:** duas famílias tipográficas no mesmo asset.
- **Escala de referência para 1080 px:** H1 64–76 px; H2 42–52 px; corpo 28–34 px; legenda mínima 22 px.
- **Escala para 1080 × 1920:** H1 76–100 px; corpo 38–46 px; nunca abaixo de 32 px em texto essencial.

### Marca e símbolo

- Perfil social principal: cavalo de xadrez bege sobre bloco verde da marca.
- Capa: cavalo de xadrez + mensagem “Liderança no momento da verdade”.
- Área de respiro do símbolo: pelo menos 1/4 da largura do cavalo em todos os lados.
- Não aplicar sombra, gradiente ou contorno ao símbolo sem uma necessidade de contraste.
- Não usar coração, aperto de mãos, cérebro de IA ou stock photo corporativa como símbolo principal.

### Grid e espaçamento

- Margem externa: 8% do menor lado.
- Grid: 12 colunas em peças horizontais; 4 colunas em peças verticais.
- Um único ponto focal por asset.
- Nunca colocar texto essencial nas bordas ou sob áreas de interface.
- Entre título e corpo: pelo menos 0,5× o tamanho do corpo.
- Entre blocos: pelo menos 1× o tamanho do corpo.

## 2. R — templates reutilizáveis

### T01 — Antes de enviar / comparação

- **Formato:** 1080 × 1350, 4:5.
- **Uso:** série principal de conflitos, feedback e decisões.
- **Focal:** uma frase humana curta.
- **Frame:** metade superior bege (“no impulso”); metade inferior verde-soft (“antes de enviar”).
- **Campos:** situação, resposta no impulso, pausa, próximo passo.
- **CTA:** “Teste com uma situação não sensível.”
- **Safe zone:** 86 px em todos os lados.

### T02 — Carrossel de orientação

- **Formato:** 1080 × 1350, 4:5; 5–7 páginas.
- **Uso:** mini-tutoriais salváveis.
- **P1:** promessa concreta, sem logo grande.
- **P2–P5:** uma ideia por página, número coral e texto ink.
- **P6:** hipótese de ação.
- **P7:** CTA + URL curta.
- **Regra:** uma frase principal por tela; nenhum parágrafo longo.

### T03 — Ponto de vista / frase

- **Formato:** 1080 × 1080, 1:1.
- **Uso:** crenças da marca e frases da base.
- **Focal:** uma frase de no máximo 12 palavras.
- **Frame:** fundo ink, texto bege, pequeno bloco verde e ponto coral.
- **CTA:** pergunta real no texto do post, não dentro da arte.
- **Não usar:** aspas sem fonte, frase atribuída a autor sem verificação.

### T04 — MCP em 60 segundos

- **Formato:** capa 1080 × 1920, 9:16; exportar vídeo vertical com captions.
- **Uso:** instalação, primeira consulta e demonstração de pausa.
- **Focal:** tela/produto; texto de apoio máximo de duas linhas.
- **Frame:** faixa bege superior, tela no centro, CTA verde no rodapé.
- **Safe zone:** 220 px no topo e 300 px no rodapé para interfaces de Reels.
- **Acessibilidade:** captions sempre ativas e alt text na publicação.

### T05 — Caso técnico open source

- **Formato:** 1600 × 900, 16:9 ou 1080 × 1350 quando publicado como documento/carrossel.
- **Uso:** GitHub, TabNews, LinkedIn técnico e diretórios.
- **Focal:** diagrama, trecho de configuração ou fluxo trigger → filtros → ação → resultado.
- **Frame:** fundo bege, bloco de código ink, destaques green/coral.
- **CTA:** “Veja, instale ou contribua no GitHub.”
- **Regra:** mostrar o mecanismo real; não usar mockup genérico de dashboard.

### T06 — Parceria / facilitador

- **Formato:** 1080 × 1350, 4:5.
- **Uso:** B2B2C, treinamento e consultoria.
- **Focal:** “Seu treinamento não evapora.”
- **Frame:** título ink sobre bege; faixa verde com o fluxo treinamento → conversa → reforço.
- **CTA:** “Conheça o piloto para facilitadores.”
- **Guardrail:** não prometer retenção, ROI ou resultado sem evidência.

## 3. A — hierarquia e legibilidade

Antes de exportar, confirmar:

- O olho encontra um único ponto focal em menos de dois segundos.
- O título continua legível na miniatura do feed.
- O contraste texto/fundo permanece forte em tela pequena.
- A mensagem faz sentido sem depender da legenda.
- A peça não parece um anúncio antes de entregar valor.
- A marca aparece como assinatura, não como o maior elemento.
- O CTA é único.
- Fotos, telas e exemplos estão anonimizados ou são fictícios.

## 4. N — produção rápida sem designer

### Fluxo recomendado sem custo

1. Duplicar o template no Figma ou Canva Free.
2. Escolher T01–T06 conforme o objetivo.
3. Trocar somente os campos marcados; não mover logo, grid ou cores.
4. Revisar a cópia usando `brand-profile.md`.
5. Exportar PNG/JPG ou MP4.
6. Criar a legenda com a mesma UTM do canal.
7. Enviar o asset final ao TryPost.
8. Para grupos e comentários, publicar manualmente; TryPost fica para Página e Reels.

### Convenção de nomes

`LMCP_{template}_{tema}_{data}_{versao}.{ext}`

Exemplos:

- `LMCP_T01_antes-de-enviar-feedback_2026-10-09_v1.png`
- `LMCP_T04_mcp-em-60s_instalacao_2026-10-12_v1.mp4`

## 5. D — distribuição

- Facebook: T01/T02 no Feed; T04 como Reel; T06 para parceiros.
- LinkedIn: T02/T05; versão mais estratégica de T06.
- GitHub/TabNews: T05; sem linguagem de anúncio.
- Comunidades: usar T01 como pergunta/diálogo, não colar a arte como propaganda.
- TryPost: publicar apenas assets finalizados, com status e leitura posterior verificados.

## 6. O que não fazer

- Não criar uma biblioteca de dezenas de templates antes de testar os seis.
- Não usar o mesmo texto e formato em todas as plataformas.
- Não misturar verde da marca com muitos gradientes ou neon.
- Não colocar o logotipo em todo canto.
- Não transformar o cavalo em mascote engraçado ou metáfora de “vencer pessoas”.
- Não usar IA para fabricar depoimentos, números ou cenas realistas de clientes.
- Não tratar o primeiro rascunho como final: o hero asset recebe revisão humana.

## Próxima produção

Para o primeiro ciclo, produzir apenas:

1. T01 — conflito no e-mail;
2. T01 — feedback difícil;
3. T02 — três passos antes de uma decisão impopular;
4. T04 — instalação local em 60 segundos;
5. T06 — reforço contínuo para facilitadores.

Isso gera cinco peças e testa a tese visual sem desperdiçar tempo em um sistema maior que a campanha.
