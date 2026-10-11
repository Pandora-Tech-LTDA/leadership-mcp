# Plano de aquisição — Facebook, landing page e eficiência

## Objetivo

Usar o Leadership MCP gratuito como **produto-gancho**: atrair pessoas que vivem situações reais de liderança, levá-las a testar/instalar e transformar os usuários mais engajados em relacionamento, parceria ou oportunidade comercial — sem confundir cadastro com lead qualificado.

## 1. Público prioritário

### Segmento A — usuários finais
- Líderes de primeira gestão, gestores de equipes e profissionais de RH.
- Gatilhos: feedback difícil, conflito, decisão impopular, conversa de alinhamento ou e-mail tenso.
- Promessa: ajuda prática no momento da conversa, sem substituir o julgamento da pessoa.

### Segmento B — multiplicadores
- Facilitadores, consultores, coaches executivos e empresas de treinamento de liderança.
- Gatilho: o treinamento termina, mas a aplicação desaparece quando surge a pressão.
- Promessa: reforço contínuo da metodologia no fluxo de trabalho do cliente.

### Segmento C — comunidade técnica/IA
- Pessoas que usam Claude/MCP, open source e ferramentas de produtividade.
- Gatilho: querem testar uma integração gratuita e útil.
- Promessa: instalação simples e caso de uso concreto, não apenas tecnologia.

Regra: não usar atributos sensíveis nem comprar/raspar listas. Priorizar comunidades e perfis públicos relevantes, conteúdo com opt-in e contatos fornecidos voluntariamente.

## 2. Facebook: descoberta e aquisição

### Onde pesquisar manualmente
- Grupos públicos e comunidades de liderança, RH, desenvolvimento de gestores, comunicação não violenta e IA aplicada ao trabalho.
- Páginas públicas de consultorias, facilitadores e escolas de liderança.
- Eventos, lives e publicações públicas com perguntas sobre feedback, conflitos e gestão.

### Método de qualificação
Registrar internamente apenas: URL pública, segmento, tema observado, motivo de relevância e próxima ação. Não exportar dados pessoais sem base e consentimento.

Pontuação inicial:
- +3 publicou/perguntou sobre uma situação concreta de liderança;
- +2 atua como facilitador, consultor, RH ou gestor;
- +2 demonstra interesse em IA/MCP/open source;
- +1 interação pública recente e pertinente;
- 0 para interesse genérico ou audiência sem contexto.

Só considerar oportunidade qualificada com 5+ pontos e uma necessidade observável. A primeira abordagem deve ser contextual, útil e individual — nunca disparo em massa.

### Conteúdo para testar
1. **Cena real:** “O treinamento acabou. Duas semanas depois chega a conversa difícil.”
2. **Microprática:** separar fato, impacto, pedido e próximo passo antes de responder.
3. **Demonstração:** mesma mensagem antes/depois, mostrando que a pessoa continua decidindo.
4. **Convite gratuito:** testar o Leadership MCP e relatar uma situação em que ele ajudou.
5. **Para parceiros:** como manter uma metodologia presente após o workshop.

CTA principal: “Testar gratuitamente”. CTA secundário: “Ver a demonstração”. Para parceiros: “Conversar sobre reforço pós-treinamento”.

Nenhum post, comentário, convite, mensagem ou anúncio deve ser publicado/enviado sem aprovação humana imediatamente antes da ação.

## 3. Auditoria inicial da landing page

A página já tem pontos fortes: demonstração antes/depois, explicação do problema, caminhos para usuário e parceiro, instalação e prova de open source/MIT.

Hipóteses de melhoria para validar com dados:

1. **Hero mais específico:** explicitar em uma frase quem deve instalar e qual situação resolve.
2. **Um CTA primário por etapa:** reduzir competição entre “começar”, “ver demo” e “sou parceiro”.
3. **Demonstração antes do cadastro:** testar “ver em 30 segundos” antes de pedir nome/email/WhatsApp.
4. **Instalação sem ambiguidade:** mostrar tempo estimado, compatibilidade, privacidade e o próximo passo após o cadastro.
5. **Prova de resultado:** adicionar relatos verificáveis, exemplos de uso e métricas somente quando existirem.
6. **Segmentação:** criar blocos/âncoras claros para usuário final e facilitador/consultoria.
7. **Instrumentação:** identificar origem (Facebook, grupo, parceiro, orgânico), campanha e etapa de conversão.
8. **Acessibilidade e confiança:** revisar contraste, foco de teclado, labels, política de dados e consentimento explícito.

Não alterar copy ou layout de produção antes de registrar uma hipótese, métrica e critério de decisão.

## 4. Funil e eventos

- `landing_view`
- `demo_view`
- `cta_start_click`
- `signup_start`
- `signup_submit`
- `consent_given`
- `access_delivered`
- `install_started`
- `install_completed`
- `first_use`
- `qualified_feedback`
- `partner_interest`

Parâmetros mínimos: `source`, `medium`, `campaign`, `content`, timestamp, etapa, consentimento e status de instalação. Não registrar conteúdo sensível de conversas nem credenciais.

Métricas principais:
- conversão landing → cadastro;
- cadastro → acesso entregue;
- acesso → instalação;
- instalação → primeiro uso;
- primeiro uso → feedback qualificado;
- taxa de parceiros entre os cadastros;
- custo por usuário ativado, apenas se houver mídia paga autorizada;
- qualidade e disposição dos leads, não apenas alcance ou reações.

## 5. Rotina de eficiência

### Diária — automática, somente leitura
- Verificar disponibilidade da landing, cadastro e endpoint de acesso.
- Validar eventos e erros de formulário.
- Ler status e métricas públicas do TryPost.
- Alertar posts falhos, agendados sem mídia e queda anormal de conversão.

### Semanal — revisão humana
- Comparar canais, campanhas e segmentos.
- Separar alcance, cadastro, ativação e lead qualificado.
- Escolher uma hipótese para a próxima semana.
- Registrar decisão, evidência, responsável e stopping rule.

### Mensal — decisão de investimento
- Avaliar ativação e qualidade por origem.
- Pausar fontes que geram volume sem instalação/uso.
- Priorizar o segmento com melhor ativação e potencial de parceria.
- Só recomendar mídia paga depois de existir conversão orgânica minimamente estável.

O script existente `marketing/scripts/performance_check.py` já gera relatório de posts/TryPost, mas atualmente não cobre o funil da landing. Próxima implementação recomendada: um `funnel_check.py` de leitura que consolide os eventos acima e gere `marketing/performance/funnel-latest.{json,md}`.

## 6. Roadmap de 30 dias

### Semana 1 — medição e baseline
- Confirmar URL de produção e fluxo de cadastro/instalação.
- Instrumentar eventos e UTMs.
- Fazer auditoria de mobile, velocidade, acessibilidade e copy.
- Criar baseline de visitantes, cadastros e instalações.

### Semana 2 — primeira hipótese de landing
- Testar hero/CTA específico para usuário final.
- Testar demonstração antes do formulário.
- Criar variante de mensagem para parceiros, sem publicar sem aprovação.

### Semana 3 — conteúdo e pesquisa no Facebook
- Mapear comunidades e páginas públicas relevantes.
- Produzir 3–5 rascunhos por segmento.
- Classificar perguntas e dores reais encontradas.
- Selecionar um experimento de conteúdo com métrica de ativação.

### Semana 4 — leitura e ajuste
- Comparar origem → instalação → primeiro uso.
- Transformar perguntas qualificadas em conteúdo e FAQ.
- Atualizar landing apenas onde a evidência justificar.
- Entregar handoff de parceiros/usuários qualificados com fonte, consentimento e próximo passo.

## Critério de sucesso da primeira fase

Não é “mais curtidas”. É identificar pelo menos um segmento com aquisição rastreável, instalação real, primeiro uso e feedback qualificado, mantendo consentimento, fonte e disposição registrados. Toda ação externa continua condicionada à aprovação humana.
