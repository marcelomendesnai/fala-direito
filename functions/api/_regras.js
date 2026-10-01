// =============================================================================
// _regras.js — FONTE ÚNICA das regras A1–A14 (manual v3, aprovado em 30/09/2026)
//
// Tudo que fala de regra lê daqui:
//   - _manual.js monta o texto do manual para o Mentor (análise, chat, ensaio,
//     preparação e biblioteca);
//   - /api/regras entrega o resumo e o treino para a tela do app.
// Antes da v3, o app mostrava um texto e o Mentor aplicava outro. Não duplique
// regra em outro arquivo: edite aqui.
//
// Governança: nenhuma regra muda sem aprovação consciente do Marcelo.
// Cada regra tem contexto (quando É e quando NÃO É erro), porque a v2 era uma
// lista de palavras e o Mentor condenava pela palavra, não pela função da fala.
// =============================================================================

export const MANUAL_VERSAO = "v3";

export const REGRAS_V3 = [
  {
    id: "A1",
    nome: "Não explicar demais",
    resumo: "Diga uma vez e confie no conteúdo. Repetir sem acrescentar nada vira brecha.",
    treino: "Diga o ponto UMA vez. Se for repetir, que seja de propósito: uma âncora curta ou o resumo do fechamento. Explicação extra só quando alguém pedir.",
    objetivo: "dizer uma vez e confiar no conteúdo",
    erro: "a mesma ideia volta sem informação nova; cadeia de justificativas que ninguém pediu, principalmente depois que o outro já entendeu",
    nao_erro: "âncora retórica usada de propósito (2 a 3 vezes numa fala motivacional); resumo no fechamento; explicação pedida pelo outro; detalhe técnico necessário para decidir",
    situacao: "negociação: mais rígido (explicação extra vira brecha); ensino ou treinamento: mais brando (repetir é método)",
    fronteira: "A3 (defesa após crítica), A11 (justificativa de recusa), A7 (enchimento dentro de uma frase)",
    gravidade: "atenção se isolado; erro se atrasa ou dilui a decisão",
  },
  {
    id: "A2",
    nome: "Não pedir aprovação",
    resumo: "Não peça aval para a sua própria posição ('faz sentido?', 'tá bom?'). Pergunta aberta para ouvir ideias não é pedir aprovação.",
    treino: "Depois de afirmar sua posição, pare e segure o silêncio. Se quiser ouvir o grupo, pergunte de forma aberta ('que objeção vocês veem?') ou peça decisão ('quem topa?').",
    objetivo: "não terceirizar a validade da própria posição",
    erro: "depois de afirmar uma posição sua, pede aval para ela ('faz sentido?', 'tá certo?', 'tá bom?', 'posso?') sem que exista uma decisão real do outro em jogo",
    nao_erro: "pergunta aberta para coletar ideias ou objeções ('vocês têm outra ideia?'); pergunta de decisão ('quem topa?'); checagem de entendimento em instrução complexa; 'Não?' que encerra uma pergunta aberta depois do silêncio",
    situacao: "liderança colaborativa pede perguntas abertas (é acerto); em negociação, pedir aval no fim enfraquece (erro)",
    fronteira: "A12 ('né?', 'entendeu?' como muleta de fim de frase)",
    gravidade: "atenção se isolado; erro se aparece ao fim de cada ponto ou em negociação",
  },
  {
    id: "A3",
    nome: "Não se justificar sob crítica",
    resumo: "Sob crítica ou provocação, não reaja no impulso nem empilhe defesas.",
    treino: "Respire e devolva uma pergunta ('o que te faz dizer isso?'). Fato errado se corrige em uma frase.",
    prerequisito: "precisa existir crítica, cobrança ou provocação de OUTRA pessoa na transcrição; sem isso, status 'não se aplica'",
    objetivo: "não perder terreno reagindo no impulso",
    erro: "resposta defensiva longa, contra-ataque ou motivos empilhados logo após a crítica",
    nao_erro: "corrigir um fato errado de forma breve e objetiva; pedir esclarecimento; assumir um erro real em uma frase",
    situacao: "vale em qualquer situação quando houver crítica",
    fronteira: "A1 (explicar demais sem ter havido crítica)",
    gravidade: "erro quando ocorre",
  },
  {
    id: "A4",
    nome: "Não pedir desculpa demais",
    resumo: "Desculpa só para erro real. Sem 'só queria' e sem pedir licença para falar.",
    treino: "Troque 'desculpa incomodar' por 'tenho uma pergunta' e vá direto.",
    objetivo: "não pedir licença para existir",
    erro: "desculpa sem erro real; 'só queria'; 'se não for incômodo'; diminutivos de permissão",
    nao_erro: "desculpa por erro real; cortesia breve e normal de abertura com cliente ou superior ('com licença'); 'desculpa, corrigindo' após lapso (isso é oralidade)",
    situacao: "abertura de pedido importante: mais rígido",
    fronteira: "Parte B (autocorreção de fala)",
    gravidade: "atenção se isolado; erro se repetido ou na abertura de pedido importante",
  },
  {
    id: "A5",
    nome: "Não revelar demais",
    resumo: "Não exponha estado emocional ou insegurança que não serve ao objetivo da conversa.",
    treino: "Separe o que o outro precisa saber (prazo, capacidade) do que é só desabafo.",
    objetivo: "proteger a posição e manter o foco",
    erro: "expor estado emocional ou insegurança sem função para o objetivo da conversa",
    nao_erro: "informar capacidade ou limite real que o outro precisa saber (prazo, carga); vulnerabilidade escolhida em 1:1 de confiança quando serve ao objetivo",
    situacao: "equipe grande ou negociação: mais rígido",
    fronteira: "A1 (explicação longa sem conteúdo emocional)",
    gravidade: "atenção ou erro conforme a exposição e o público",
  },
  {
    id: "A6",
    nome: "Não tapar o silêncio / não negociar contra si",
    resumo: "Depois de propor, segure o silêncio. Não faça concessão que ninguém pediu.",
    treino: "Depois de propor ou perguntar, conte até 7 calado. O silêncio trabalha por você.",
    prerequisito: "houve proposta ou pergunta sua seguida de silêncio (pausa medida) ou de falta de resposta do outro",
    objetivo: "não ceder só para preencher o silêncio",
    erro: "concessão sua sem o outro pedir (desconto, prazo, recuo) logo após propor e não receber resposta",
    nao_erro: "encerrar pergunta aberta sem resposta ('Não? Então seguimos'); acrescentar dado novo relevante; reformular porque o outro não entendeu",
    situacao: "negociação: erro; demais casos: atenção",
    fronteira: "A2 (pergunta de aval) e A1 (repetição)",
    gravidade: "erro em negociação; atenção nos demais casos",
  },
  {
    id: "A7",
    nome: "Falar o necessário",
    resumo: "Cada frase carrega informação. Frase longa e clara não é erro; gagueira também não.",
    treino: "Corte enchimento e digressão. Gagueira se trata com pausa antes de começar, não com frase curta.",
    objetivo: "cada frase carregar informação",
    erro: "enchimento, redundância dentro do mesmo trecho ou digressão que faz o ouvinte perder o fio",
    nao_erro: "frase longa e clara; gagueira, autocorreção e recomeço de frase (são oralidade, vão para a Parte B); detalhe útil",
    situacao: "reporte a superior: mais rígido",
    fronteira: "A1 (repetição da ideia inteira), A9 (atraso do ponto), A12 (muleta). PROIBIDO usar A7 no mesmo trecho já avaliado em A9",
    gravidade: "atenção; erro só se o trecho ficou incompreensível",
  },
  {
    id: "A8",
    nome: "Clareza com critério",
    resumo: "Ao delegar ou definir próximo passo: o quê + quando + critério.",
    treino: "Feche todo pedido com 'o quê, até quando e como vou saber que está bom'.",
    prerequisito: "você está delegando, pedindo ou definindo próximo passo; conversa exploratória = 'não se aplica'",
    objetivo: "o outro saber exatamente o que fazer",
    erro: "falta o quê, o quando ou o critério, e a falta gera ambiguidade real",
    nao_erro: "o item ausente foi dito em outro trecho da conversa; o outro é quem define; encaminhamento deliberadamente aberto por ser voluntário e sem urgência (vira atenção, não erro)",
    situacao: "delegação formal: rígido; encaminhamento informal: brando",
    fronteira: "A9 (ordem da fala)",
    gravidade: "erro em delegação formal; atenção em encaminhamento informal",
  },
  {
    id: "A9",
    nome: "Começar pela conclusão quando couber",
    resumo: "O ouvinte precisa saber cedo o que você quer dele. Contexto antes do ponto só se ele precisar para entender.",
    treino: "Teste antes de abrir a boca: 'se eu cortar esse contexto, o ouvinte perde algo de que precisa?' Se não perde, comece pelo ponto. Storytelling curto que leva ao ponto é permitido.",
    objetivo: "o ouvinte saber cedo o que você quer dele",
    erro: "antes do ponto, coloca contexto de que o ouvinte NÃO precisa para entender ou decidir: bastidor, justificativa pessoal, histórico administrativo",
    nao_erro: "gancho narrativo curto (até 3 frases ou cerca de 20 segundos) que leva ao ponto e que o público precisa para entender a proposta; notícia sensível, cobrança ou negociação em que preparar o terreno é estratégico; o ponto já foi dito antes e o contexto vem depois (sinais: 'é basicamente isso', 'como eu falei'), caso em que se avalia A1 e não A9; resposta a uma pergunta do outro",
    situacao: "reporte a superior e pedido: rígido; fala motivacional para equipe: storytelling permitido se chegar ao ponto rápido",
    fronteira: "A7 (não repetir o mesmo trecho), A1 (contexto depois do ponto já dito)",
    gravidade: "erro quando o atraso é longo e o contexto é inútil; atenção quando curto",
  },
  {
    id: "A10",
    nome: "Não dar 'sim automático'",
    resumo: "Antes de aceitar algo com custo, prazo ou risco, pause e avalie.",
    treino: "'Deixa eu ver e te respondo' ou 3 segundos de pausa antes do sim.",
    prerequisito: "o outro fez um pedido",
    objetivo: "não assumir compromisso no impulso",
    erro: "aceite imediato de algo com custo, prazo ou risco relevante, sem avaliar",
    nao_erro: "aceitar tarefa trivial, rotineira ou dentro do seu papel; aceitar depois que o outro detalhou; concordar com um fato",
    situacao: "pedido de superior ou cliente com prazo: mais rígido",
    fronteira: "A11 (recusa)",
    gravidade: "erro quando o compromisso é relevante",
  },
  {
    id: "A11",
    nome: "Dizer não sem discurso",
    resumo: "Recusa curta: um motivo objetivo e, se couber, uma alternativa.",
    treino: "'Não consigo até sexta; consigo na terça.' Sem desculpa culpada.",
    prerequisito: "houve recusa sua; sem recusa, status 'não se aplica'",
    objetivo: "recusar sem abrir brecha",
    erro: "recusa longa, com justificativa culpada e desculpas",
    nao_erro: "recusa com um motivo objetivo curto e/ou alternativa (isso é ACERTO)",
    situacao: "vale em qualquer situação com recusa",
    fronteira: "A1 e A4",
    gravidade: "erro quando ocorre",
  },
  {
    id: "A12",
    nome: "Muletas de linguagem",
    resumo: "Meta zero. Conta só quando a palavra é enchimento: 'né?', 'tipo', 'então'/'aí' emendando frases, 'cara' vocativo, 'sabe?'/'entendeu?' no fim.",
    treino: "Troque a muleta por uma micro-pausa. Silêncio é melhor que muleta.",
    objetivo: "fala limpa, meta de zero muletas",
    erro: "muleta confirmada (ver lista abaixo) com densidade alta ou concentrada no momento-chave (abertura, pedido, fechamento)",
    nao_erro: "a mesma palavra com sentido gramatical: 'que tipo de balança', 'então vamos fazer X' (conclusão), 'aí' de lugar, 'o cara do setor', 'ele entendeu', 'você sabe quanto custa?'; citação da fala de outra pessoa",
    conta_como: "'né', 'sabe?', 'entendeu?' como apêndice no fim de frase; 'tipo' como preenchimento; 'então' e 'aí' como preenchimento repetido para emendar frases; 'cara' como vocativo",
    situacao: "registro informal com a equipe tolera 'cara' como estilo, mas continua contado para a meta",
    fronteira: "A2 ('né?' não é pedido de aprovação)",
    gravidade: "registro por ocorrência; atenção com densidade moderada; erro com densidade alta ou concentração no momento-chave",
  },
  {
    id: "A13",
    nome: "Interromper vs interjetar",
    resumo: "Deixe o outro concluir a ideia antes de falar.",
    treino: "Deixe a última palavra dele 'cair'; retome com 'quando você disse X...'.",
    prerequisito: "duas vozes e sobreposição clara na transcrição; a separação de locutores pode errar, então sem sobreposição clara o status é 'não avaliável'",
    objetivo: "não sinalizar ansiedade nem atropelar o outro",
    erro: "cortar o outro antes de ele concluir a ideia",
    nao_erro: "interjeição curta de acompanhamento ('uhum', 'certo'); retomar a palavra depois de pausa do outro",
    situacao: "vale em qualquer situação com duas vozes",
    fronteira: "nenhuma",
    gravidade: "atenção se isolado; erro se repetido",
  },
  {
    id: "A14",
    nome: "Linguagem de convicção",
    resumo: "Sem 'eu acho'/'acho que' antes de posição, recomendação ou decisão sua. Dúvida real de fato não entra.",
    treino: "Afirme o que você sustenta: 'minha recomendação é', 'com a Lumiás é melhor'. Para dúvida real, use 'se não me engano'.",
    objetivo: "afirmar o que você sustenta",
    erro: "'eu acho'/'acho que' antes de posição, recomendação ou decisão SUA",
    nao_erro: "dúvida factual real ('acho que era gerente'; sugestão neutra: 'se não me engano'); suposição sobre o outro ('acho que vocês ouviram', no máximo atenção); citação da fala de outra pessoa; brainstorm aberto em que a intenção declarada é propor hipóteses",
    situacao: "vale em qualquer situação; o Marcelo quer eliminar o uso em posição própria",
    fronteira: "A12 (hesitação genérica)",
    gravidade: "erro por ocorrência confirmada em posição própria",
  },
];

// Textos curtos para a tela do app.
export function regrasParaTela() {
  const regras = {};
  const treino = {};
  for (const r of REGRAS_V3) {
    regras[r.id] = `${r.nome}: ${r.resumo}`;
    treino[r.id] = r.treino;
  }
  return { versao: MANUAL_VERSAO, regras, treino };
}

// Bloco de texto das regras para o Mentor.
export function regrasParaMentor() {
  return REGRAS_V3.map((r) => {
    const linhas = [`### ${r.id}. ${r.nome}`];
    if (r.prerequisito) linhas.push(`- Pré-requisito: ${r.prerequisito}.`);
    linhas.push(`- Objetivo: ${r.objetivo}.`);
    linhas.push(`- É erro quando: ${r.erro}.`);
    if (r.conta_como) linhas.push(`- Conta como muleta: ${r.conta_como}.`);
    linhas.push(`- NÃO é erro quando: ${r.nao_erro}.`);
    linhas.push(`- Muda com a situação: ${r.situacao}.`);
    linhas.push(`- Não confundir com: ${r.fronteira}.`);
    linhas.push(`- Gravidade: ${r.gravidade}.`);
    return linhas.join("\n");
  }).join("\n\n");
}
