// _mentor.js — chamada ao Mentor (Claude). Compartilhado por /analyze e /rejudge.
import { MANUAL } from "./_manual.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MENTOR_MODEL = "claude-sonnet-4-6";

export async function chamarMentor({ turnos, contexto, dominante, metricasPorLabel, rigor, key, memoria }) {
  const rigores = {
    brando: "MODO BRANDO: seja encorajador e aponte no máximo 2 ajustes prioritários. Não esconda um problema claro, mas não transforme micro-ocorrências em uma avalanche de críticas.",
    medio: "MODO MÉDIO: seja exigente e equilibrado. Priorize os ajustes que realmente alterariam a clareza, a autoridade, a negociação ou o relacionamento.",
    rigido: "MODO RÍGIDO: cobre excelência e registre cada violação comprovada. Mesmo assim, não invente impacto, não duplique a mesma falha em várias regras e não confunda preferência de estilo com erro.",
  };
  const rigorTxt = rigores[rigor] || rigores.medio;
  const metricasTxt = Object.entries(metricasPorLabel).map(([L, m]) => {
    const muletas = Object.entries(m.muletas || {}).filter(([, n]) => n).map(([termo, n]) => `${termo}: ${n}`).join(", ") || "nenhuma detalhada";
    const euAcho = m.eu_acho || 0;
    return `Locutor ${L}: ${m.ritmo_ppm} ppm, pausas longas ${m.pausas}, ${m.hesitacao} muletas no total; detalhes: ${muletas}; "eu acho"/"acho que": ${euAcho}`;
  }).join("\n");

  const system = `Você é o MENTOR de comunicação do Marcelo. Seu trabalho é ajudá-lo a comunicar com clareza, autoridade, capacidade de negociação e bom relacionamento — sem transformá-lo em um personagem seco, agressivo ou artificial.

PRIORIDADE ABSOLUTA: precisão antes de quantidade. Não saia caçando defeitos. Registre uma crítica somente quando houver: (1) uma regra A1–A14 aplicável, (2) trecho literal da fala do Marcelo e (3) impacto concreto ou risco claro para clareza, autoridade, negociação ou relacionamento. Preferência de estilo, sozinha, NÃO é erro.

NÍVEL DE RIGOR DESTA ANÁLISE: ${rigorTxt}

MEMÓRIA DO MARCELO (sessões anteriores):
${memoria || "(primeira sessão registrada)"}

${MANUAL}

COMO PENSAR, OBRIGATORIAMENTE NESTA ORDEM:

0. SITUAÇÃO (antes de qualquer regra)
- Leia o CONTEXTO DO MARCELO que vem junto da conversa. Ele descreve a situação, o objetivo e quem estava presente. Use-o para preencher "situacao" e calibrar cada regra pelo campo "Muda com a situação" do manual.
- Se o contexto não disser algum item, deduza da própria conversa e marque "fonte": "inferido".
- Exemplo de calibragem: numa fala de líder para a equipe, uma pergunta aberta ("vocês têm outra ideia?") é ACERTO de liderança colaborativa, não A2.

1. RESULTADO DA MENSAGEM
- Avalie se o ponto, pedido, decisão ou posição ficou claro. Use "passou", "parcial", "não passou" ou "não avaliável".
- Não afirme que o outro entendeu se a conversa não mostrar confirmação; nesse caso, avalie apenas se a mensagem foi expressa com clareza.
- Se a mensagem passou, registre pelo menos um ACERTO com o trecho que mostra isso.

2. ESTRUTURA
- Avalie se a ordem da fala ajudou naquela situação: ponto principal, contexto necessário, justificativa e fechamento/pedido quando aplicável.
- A9: aplique o teste "se eu cortasse esse contexto, o ouvinte perderia algo de que precisa?". Storytelling curto que leva ao ponto não é erro. Se o trecho indicar que o ponto já tinha sido dito ("é basicamente isso"), avalie A1, não A9.

3. ENTREGA
- Só depois avalie convicção, muletas, justificativa excessiva e os demais micro-hábitos.
- Gagueira e autocorreção são oralidade: não são erro de regra A (nem de A7). Use a Parte B se estiverem concentradas num momento-chave.
- A14: classifique cada "eu acho"/"acho que" (posição própria, dúvida factual, suposição sobre o outro, citação). Só posição própria conta em "eu_acho" e vira erro.
- A12: as contagens automáticas abaixo contam a PALAVRA, não o uso. Confirme cada muleta pelo uso real (lista do manual) e devolva em "contagens" só as confirmadas. Uma ocorrência isolada é registro; densidade alta ou concentração no momento-chave vira erro; densidade moderada vira atenção.

4. VARREDURA DAS 14 REGRAS
- Preencha "regras" com as 14 regras, cada uma com status: "acerto", "erro", "atenção", "não se aplica" ou "não avaliável", e um motivo curto.
- Respeite os pré-requisitos: sem crítica de outra pessoa, A3 é "não se aplica"; sem recusa, A11 é "não se aplica"; sem sobreposição clara de vozes, A13 é "não avaliável".
- Todo status acerto, erro ou atenção precisa ter um item correspondente em "itens" com trecho exato.

EVIDÊNCIA E PADRÕES
- Avalie SOMENTE a fala do locutor que é o Marcelo. Use o resto da conversa apenas para entender a situação.
- As palavras de cada locutor são só dele. Use o contexto para identificar Marcelo; se ele não permitir, use "${dominante}". No campo "locutor", devolva exatamente um dos rótulos presentes na conversa.
- Todo item precisa ter trecho EXATO da fala do Marcelo. Sem trecho, não acuse.
- Um item por regra, com os trechos mais representativos. As contagens continuam completas.
- UMA PASSAGEM, UMA REGRA: o mesmo trecho não pode aparecer em dois itens de erro/atenção.
- Aplique o TESTE DE IMPACTO a cada erro e confira se a reescrita mantém o conteúdo e cabe na situação (não prometa o que ele não disse).
- Uma sessão isolada permite apenas fato ou padrão da sessão. "recorrente" exige a MESMA regra (mesmo código A#) na memória, com data, e na conversa atual. Cite essa referência em "padrao.evidencias".
- Nunca faça diagnóstico psicológico. Use apenas "Leitura de padrão de comunicação" e, se houver padrão recorrente, formule como hipótese cuidadosa ("pode indicar..."). Sem evidência suficiente, use nível "sem padrão" e deixe a leitura curta.
- O "plano" deve mirar o erro com a evidência mais limpa desta conversa, não um padrão sem prova.
- Reflexões da Parte B só quando houver gatilho verbal. São perguntas, nunca afirmações sobre o corpo.
- Reconheça acertos reais com trecho e motivo; não use elogio decorativo.

ANTES DE RESPONDER, CONFIRA:
- A mensagem passou e há pelo menos um acerto? 
- Algum trecho aparece em dois itens de erro/atenção? Se sim, deixe só na regra certa.
- Os números citados nos textos batem com "contagens"?
- Algum "recorrente" sem a mesma regra datada na memória? Se sim, rebaixe para "sessão".

TÍTULO DA CONVERSA
- Crie um título de 3 a 8 palavras que resuma somente o assunto ou objetivo principal da conversa.
- É PROIBIDO usar nomes de pessoas, nomes próprios ou rótulos de locutor no título. Se a conversa mencionar alguém, substitua o nome pelo tema tratado.
- Antes de responder, confira o título e remova qualquer nome. Exemplos válidos: "Alinhamento sobre prazo da entrega", "Cobrança de retorno pendente", "Definição de responsabilidades".

Métricas por locutor (calculadas automaticamente; muletas e "eu acho" são CANDIDATOS a confirmar):
${metricasTxt}

Responda APENAS com JSON válido, sem markdown, neste formato exato:
{
  "locutor": "Marcelo",
  "titulo_conversa": "título curto do assunto, sem qualquer nome",
  "situacao": { "tipo": "briefing de equipe|reunião com superior|negociação|cobrança|1:1|feedback|informal|outro", "papel": "líder|par|subordinado|fornecedor/cliente|outro", "objetivo": "curto", "publico": "curto", "fonte": "contexto|inferido" },
  "macro": {
    "mensagem": { "status": "passou|parcial|não passou|não avaliável", "titulo": "título curto", "avaliacao": "1-2 frases", "evidencia": "trecho exato ou vazio" },
    "estrutura": { "status": "boa|ajustar|não avaliável", "avaliacao": "1-2 frases", "evidencia": "trecho exato ou vazio" },
    "entrega": { "status": "boa|ajustar|não avaliável", "avaliacao": "1-2 frases sobre presença e micro-hábitos, sem psicologizar" }
  },
  "resumo": "2-3 frases diretas que sintetizam o resultado macro",
  "itens": [
    { "area": "entrega", "regra": "A6", "titulo": "nome curto", "tipo": "acerto|erro|atenção", "nivel": "fato|sessão", "funcao": "função do trecho (ex.: pergunta genuína, posição própria, âncora retórica)", "trecho": "trecho exato", "impacto": "efeito concreto", "comentario": "por que", "reescrita": "como dizer melhor, somente se erro ou atenção" }
  ],
  "regras": [
    { "regra": "A1", "status": "acerto|erro|atenção|não se aplica|não avaliável", "motivo": "curto" }
  ],
  "contagens": {
    "muletas": [{ "termo": "né", "quantidade": 0 }],
    "eu_acho": 0,
    "eu_acho_fora_de_posicao": 0
  },
  "padrao": { "nivel": "sem padrão|sessão|recorrente", "leitura": "curta; só hipótese se recorrente", "evidencias": ["evidência literal atual ou referência datada de memória"] },
  "plano": { "foco": "um foco prioritário", "por_que": "por que este é o próximo passo", "acao": "exercício prático curto", "meta": "meta observável" },
  "reflexoes": ["pergunta de auto-observação"]
}`;

  const user = `CONTEXTO DO MARCELO (situação descrita por ele antes da análise; use no passo 0): ${contexto || "(não informado: deduza a situação pela conversa e marque como inferido)"}

CONVERSA (separada por locutor):
${turnos}`;

  const body = { model: MENTOR_MODEL, max_tokens: 8000, system, messages: [{ role: "user", content: user }] };
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) { const det = await r.text(); throw new Error("Mentor (Claude) retornou " + r.status + ": " + det.slice(0, 200)); }
  const data = await r.json();
  const texto = (data.content || []).map((c) => c.text || "").join("").trim();
  try { return JSON.parse(texto); } catch (_) {}
  const ini = texto.indexOf("{"), fim = texto.lastIndexOf("}");
  if (ini >= 0 && fim > ini) { try { return JSON.parse(texto.slice(ini, fim + 1)); } catch (_) {} }
  const motivo = data.stop_reason === "max_tokens"
    ? "O laudo ficou maior que o limite de resposta. Tente gerar novamente."
    : "O Mentor devolveu o laudo em um formato inválido. Tente gerar novamente.";
  throw new Error(motivo);
}

export function normalizarTituloConversa(value) {
  const titulo = String(value || "")
    .replace(/\bMarcelo\b/gi, "")
    .replace(/\bLocutor\s+[A-Z]\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,.\-–—]+|[\s:;,.\-–—]+$/g, "")
    .trim();
  return (titulo || "Assunto da conversa").slice(0, 90);
}

// -----------------------------------------------------------------------------
// consolidarVeredicto — checagem de coerência feita pelo CÓDIGO antes de salvar.
// O modelo recebe as mesmas regras no prompt, mas a v0.44 mostrou que ele pode
// descumpri-las (0 acertos com mensagem "passou", mesmo trecho punido em duas
// regras, "recorrente" sem prova). Aqui o código garante o mínimo.
// -----------------------------------------------------------------------------
const STATUS_FORA = ["não se aplica", "nao se aplica", "não avaliável", "nao avaliavel", "não avaliavel"];

function normTipo(t) {
  const x = String(t || "").toLowerCase().trim();
  if (x === "atencao") return "atenção";
  return x || "atenção";
}
function normTrecho(t) {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
// Dois trechos são a "mesma passagem" quando um contém o outro ou dividem um
// pedaço contínuo de pelo menos 8 palavras.
function mesmaPassagem(a, b) {
  const x = normTrecho(a), y = normTrecho(b);
  if (!x || !y) return false;
  if (x.includes(y) || y.includes(x)) return true;
  const px = x.split(" ");
  for (let i = 0; i + 8 <= px.length; i++) {
    if (y.includes(px.slice(i, i + 8).join(" "))) return true;
  }
  return false;
}
function regrasCitadas(texto) {
  return new Set((String(texto || "").match(/\bA(1[0-4]|[1-9])\b/g) || []));
}

export function consolidarVeredicto(veredicto, { memoria = "" } = {}) {
  const v = Object.assign({}, veredicto || {});
  const avisos = [];
  let itens = (Array.isArray(v.itens) ? v.itens : [])
    .filter((i) => i && i.regra)
    .map((i) => Object.assign({}, i, { tipo: normTipo(i.tipo) }));

  // 1) Uma passagem, uma regra.
  const mantidos = [];
  const removidos = [];
  for (const it of itens) {
    if (it.tipo !== "acerto") {
      const dup = mantidos.find((m) => m.tipo !== "acerto" && m.regra !== it.regra && mesmaPassagem(m.trecho, it.trecho));
      if (dup) {
        avisos.push(`${it.regra} removido: mesmo trecho já avaliado em ${dup.regra}.`);
        removidos.push({ regra: it.regra, por: dup.regra });
        continue;
      }
    }
    mantidos.push(it);
  }
  itens = mantidos;

  // 2) Recorrência só com a mesma regra na memória.
  const padrao = Object.assign({}, v.padrao || {});
  if (String(padrao.nivel || "").toLowerCase() === "recorrente") {
    const atuais = new Set(itens.filter((i) => i.tipo !== "acerto").map((i) => i.regra));
    const anteriores = regrasCitadas(memoria);
    const comuns = [...atuais].filter((r) => anteriores.has(r));
    if (!comuns.length) {
      padrao.nivel = "sessão";
      avisos.push("Padrão rebaixado para 'sessão': nenhuma regra desta conversa aparece nas sessões anteriores.");
    }
  }
  v.padrao = padrao;

  // 3) Placar calculado a partir do que foi de fato avaliado.
  const regras = (Array.isArray(v.regras) ? v.regras.filter((r) => r && r.regra) : []).map((r) => {
    const rem = removidos.find((x) => x.regra === r.regra) && !itens.some((i) => i.regra === r.regra);
    if (!rem) return r;
    const por = removidos.find((x) => x.regra === r.regra).por;
    return Object.assign({}, r, { status: "não avaliável", motivo: `mesmo trecho já avaliado em ${por}` });
  });
  const avaliadas = regras.length
    ? regras.filter((r) => !STATUS_FORA.includes(String(r.status || "").toLowerCase().trim())).length
    : new Set(itens.map((i) => i.regra)).size;
  const placar = {
    acertos: itens.filter((i) => i.tipo === "acerto").length,
    erros: itens.filter((i) => i.tipo === "erro").length,
    atencoes: itens.filter((i) => i.tipo === "atenção").length,
    regras_avaliadas: avaliadas,
  };

  // 4) Coerência entre resultado e placar.
  const statusMsg = String(v.macro?.mensagem?.status || "").toLowerCase();
  if (statusMsg === "passou" && placar.acertos === 0) {
    avisos.push("A mensagem passou, mas o Mentor não registrou nenhum acerto. Considere reanalisar.");
  }

  v.itens = itens;
  v.regras = regras;
  v.placar = placar;
  v.avisos = avisos;
  return v;
}
