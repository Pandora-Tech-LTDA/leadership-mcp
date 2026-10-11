// eval-cases.js — bateria de situações para avaliar o classificador de gatilhos.
//
// Cada caso é [situação, esperado] onde `esperado` é um id de gatilho, um array de ids
// aceitáveis (casos genuinamente ambíguos) ou null (não deve ativar gatilho nenhum).
// A bateria é usada pelo smoke-test (CI) e serve de régua para evoluir o classificador:
// toda mudança em keywords/pesos precisa passar por aqui.

export const CASES = [
  // --- Casos originais do prompt v0.3 -------------------------------------
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

  // --- Conflito descrito sem as palavras-chave óbvias ----------------------
  ["meu par de outro time passou por cima de mim numa call e estou remoendo isso", "conflito"],
  ["duas pessoas do meu time não se falam mais e o clima contaminou o resto", "conflito"],
  ["fui acusado numa thread de ter escondido informação e não foi isso que aconteceu", "conflito"],
  ["o gerente de outra área vive desqualificando meu trabalho na frente dos outros", "conflito"],

  // --- Feedback / avaliação em variações ----------------------------------
  ["minha liderada chorou na 1:1 depois que apontei os atrasos dela", "feedback"],
  ["quero agradecer publicamente uma pessoa do time sem parecer favoritismo", "feedback"],
  ["recebi uma avaliação de desempenho que considero injusta e quero responder", "feedback"],

  // --- Decisão com impacto em variações ------------------------------------
  ["vamos encerrar o contrato de metade dos terceirizados e eu comunico amanhã", "decisao-com-impacto"],
  ["preciso avisar o time que as férias coletivas foram canceladas", "decisao-com-impacto"],
  ["como conto para a equipe que vamos voltar ao presencial obrigatório", "decisao-com-impacto"],

  // --- Relacionamento interno em variações ---------------------------------
  ["quero construir uma relação melhor com meu novo chefe", "relacionamento"],
  ["vou ter minha primeira reunião com a diretoria e quero causar boa impressão", "relacionamento"],
  ["como abordo um colega de outra área para propor uma parceria interna", "relacionamento"],

  // --- Interação externa em variações --------------------------------------
  ["o cliente ameaçou cancelar o contrato depois do incidente de ontem", "interacao-externa"],
  ["como negocio um prazo maior com o parceiro sem queimar a relação", "interacao-externa"],
  ["preciso dar um retorno negativo para a agência que nos atende", "interacao-externa"],

  // --- Âmbito pessoal (família, amigos, sócios, vizinhos) ------------------
  ["briguei com meu irmão por causa da herança e não nos falamos há um mês", "relacionamento-pessoal"],
  ["meu sócio e eu discordamos sobre o rumo da empresa e a conversa sempre descamba", "relacionamento-pessoal"],
  ["minha esposa disse que eu não escuto ela e eu fiquei na defensiva", "relacionamento-pessoal"],
  ["como converso com meu pai sobre a saúde dele sem que ele se feche", "relacionamento-pessoal"],
  ["um amigo próximo se magoou com algo que eu disse na festa e está distante", "relacionamento-pessoal"],
  ["preciso falar com meu vizinho sobre o barulho sem virar briga", "relacionamento-pessoal"],
  ["meu filho adolescente não conversa mais comigo e responde tudo com grosseria", "relacionamento-pessoal"],

  // --- Ambíguos legítimos (mais de uma leitura razoável) --------------------
  ["a sócia quer vender a empresa e eu não; a reunião de amanhã vai ser tensa", ["relacionamento-pessoal", "conflito", "decisao-com-impacto"]],
  ["preciso demitir uma pessoa que também é minha amiga", ["decisao-com-impacto", "relacionamento-pessoal"]],
  ["o fornecedor errou de novo e dessa vez eu perdi a paciência na ligação", ["interacao-externa", "conflito"]],

  // --- Divergência e silêncio ----------------------------------------------
  ["ninguém discorda nas reuniões e eu saio achando que todos concordaram por educação", "divergencia-e-silencio"],
  ["meu time concorda com tudo que eu proponho e isso me preocupa", "divergencia-e-silencio"],
  ["tem uma pessoa do time que não fala nada mas eu percebo que discorda", "divergencia-e-silencio"],
  ["antes de decidir quero saber qual é a melhor objeção que está sobre a mesa", "divergencia-e-silencio"],
  ["a decisão passou fácil demais e ninguém trouxe nenhum risco", "divergencia-e-silencio"],
  ["eu não me sinto à vontade para discordar do meu chefe na reunião", "divergencia-e-silencio"],

  // --- Autoridade informal -------------------------------------------------
  ["eu lidero o projeto mas não sou o chefe dessas pessoas", "autoridade-informal"],
  ["preciso convencer alguém de outra área que não me reporta a mudar o processo", "autoridade-informal"],
  ["meu especialista mais experiente não aceita minha liderança", "autoridade-informal"],
  ["assumi a coordenação e o time ainda não me enxerga nesse papel", "autoridade-informal"],
  ["sou mais novo na empresa e preciso conduzir pessoas com mais tempo de casa", "autoridade-informal"],
  ["não tenho autoridade para cobrar esse compromisso de quem não é meu subordinado", "autoridade-informal"],

  // --- Limites e carga -----------------------------------------------------
  ["não consigo dizer não para mais um pedido e estou sobrecarregado", "limites-e-carga"],
  ["preciso renegociar o prazo sem parecer que não dou conta do trabalho", "limites-e-carga"],
  ["uma pessoa do meu time está esgotada e eu ainda recebo mais demanda", "limites-e-carga"],
  ["aceitei tudo e agora não vou conseguir entregar nada no prazo", "limites-e-carga"],
  ["como recuso uma demanda que não cabe na minha semana sem prejudicar a relação", "limites-e-carga"],

  // --- Ambíguos novos (mais de uma leitura razoável) ------------------------
  ["ninguém contesta o que a liderança propõe e eu não sei se é alinhamento ou medo", ["divergencia-e-silencio", "conflito"]],
  ["estou no limite e perdi a paciência com o time na reunião", ["limites-e-carga", "conflito"]],
  ["quero influenciar sem autoridade formal, mas a pessoa é sócia da empresa", ["autoridade-informal", "relacionamento-pessoal"]],

  // --- Não-gatilho (técnico/operacional, sem destinatário) -----------------
  ["como faço um relatório de desempenho do time", null],
  ["planilha para controlar tarefas do time", null],
  ["quem aprova esse tipo de compra", null],
  ["qual a melhor ferramenta para gráficos de burndown", null],
];
