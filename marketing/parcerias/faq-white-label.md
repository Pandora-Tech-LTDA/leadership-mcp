# FAQ de White-label — Parceria B2B2C

**Público:** parceiro em avaliação (empresa de treinamento, consultoria, coach).
**Objetivo:** responder as objeções mais comuns antes/depois da demo. As respostas
técnicas se apoiam no [`white-label.md`](white-label.md); o pitch está em [`pitch.md`](pitch.md).

> Onde houver `[colchetes]`, ajuste ao seu modelo antes de enviar.

---

## Marca e experiência do cliente

**O cliente final vê "Leadership MCP"?**
Não, se você não quiser. A base de conhecimento é sua — você forka o repositório, coloca
a sua metodologia e a sua linguagem, e o servidor lê do seu repo. O prompt de sistema que
o cliente cola pode falar em nome da sua marca. O nome "Leadership MCP" é do projeto
open-source por trás; o produto que o líder usa no dia a dia é o seu.

**Consigo usar minha própria metodologia, não a de vocês?**
Sim — esse é o ponto. A base padrão parte de liderança humanista (Barry-Wehmiller/Chapman,
Sinek), mas os arquivos `.md` são 100% editáveis. Você substitui gatilhos, filtros, ações
e resultados pelos princípios que **você** ensina. O produto passa a reforçar o seu programa.

**Preciso de time técnico para manter?**
Para editar a base, não: é markdown, qualquer pessoa edita no navegador pelo GitHub. Para o
deploy centralizado (um servidor que todos os clientes usam), sim — há um passo técnico
único, documentado em [`white-label.md`](white-label.md). Alternativa: cada cliente instala
localmente (também documentado) e você só entrega a base.

---

## Custo e modelo comercial

**Quanto custa a tecnologia?**
O núcleo é **open-source (MIT), gratuito**. Não há licença de software a pagar para nós. Seu
custo é o de hospedar um servidor (se optar pelo deploy centralizado — baixo, cabe num VPS)
e o seu tempo de curar a base. O modelo comercial da **sua** oferta ao cliente é seu.

**Tem custo de API de IA?**
Não pela nossa parte. O Leadership MCP é **determinístico e offline-first** — não chama
nenhum LLM no servidor. Quem paga a IA é o cliente, pela assinatura do assistente que ele
já usa (Claude etc.). Você não entra nessa conta.

**Como eu cobro do meu cliente?**
A gente sugere três caminhos (ver [`README.md`](README.md)): license fee anual por empresa
cliente, setup + manutenção, ou incluso no seu pacote como diferencial. `[definir com o parceiro]`.

---

## Exclusividade e concorrência

**Vocês vão vender isso para o meu concorrente?**
O projeto é open-source e público — qualquer um pode forká-lo, isso é da natureza do MIT. O
que **diferencia** você não é a tecnologia, é a **sua base de conhecimento** (sua metodologia,
seus casos, sua voz) e a sua marca. Isso é seu e não se copia. Exclusividade contratual de
território/segmento pode ser conversada `[a definir na parceria]`, mas o motor em si é aberto.

**Se é open-source, por que eu preciso de vocês?**
Você não *precisa* — pode forkar e tocar sozinho. A parceria existe para acelerar: onboarding
técnico, curadoria da base, atualizações do motor, e evitar que você reinvente a operação.
`[definir escopo do suporte]`.

---

## Dados, privacidade e LGPD

**Vocês têm acesso aos dados dos meus clientes?**
Não. O servidor não coleta nem armazena as situações que o líder descreve — ele classifica o
gatilho por palavras-chave e monta a orientação, tudo em memória, sem persistência. Não há
telemetria. No seu fork, você controla o servidor inteiro.

**As conversas do líder passam por vocês?**
Não. A conversa acontece entre o líder e o assistente de IA dele. O MCP só devolve a
orientação da base quando chamado. Se você rodar o seu próprio servidor, nada trafega por nós.

**E a LGPD?**
Como não há coleta nem armazenamento de dados pessoais pelo servidor, a superfície é mínima.
A responsabilidade pelo tratamento de dados na ponta é do provedor do assistente de IA
(ex.: Anthropic) e do cliente. `[validar com o jurídico do parceiro para o seu contexto]`.

---

## Propriedade e continuidade

**De quem é a base que eu construir?**
Sua. Você edita no seu fork, sob a sua conta. A licença MIT do motor não reivindica nada
sobre o conteúdo que você cria.

**E se o projeto original parar?**
Seu fork continua funcionando de forma independente — ele não depende de um serviço nosso no
ar. O motor é um servidor Node.js autocontido com uma única dependência (o SDK do MCP). Você
tem o código e a base; nada trava.

**Recebo as melhorias do motor depois?**
Sim, quando quiser: como é um fork, você puxa (`git pull` do upstream) as melhorias do motor
sem perder a sua base. Você escolhe quando atualizar.

---

## Rollout

**Quanto tempo para colocar de pé?**
Uma base mínima personalizada + demo funcional: `[estimar — tipicamente poucos dias]`. O
guia passo a passo está em [`white-label.md`](white-label.md), incluindo o checklist de rollout.

**Como o líder instala?**
Dois caminhos: conector remoto (Claude web/mobile, sem instalar nada — só uma credencial) ou
instalação local (Claude Desktop). O caminho sem fricção é o conector remoto.

**Vocês ajudam na primeira implantação?**
`[definir: sim, no pacote de setup / sob demanda / self-service com o guia]`.
