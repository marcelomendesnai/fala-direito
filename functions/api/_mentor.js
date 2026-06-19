// _mentor.js — chamada ao Mentor (Claude). Compartilhado por /analyze e /rejudge.
import { MANUAL } from "./_manual.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MENTOR_MODEL = "claude-sonnet-4-6";

export async function chamarMentor({ turnos, contexto, dominante, metricasPorLabel, rigor, key }) {
  const rigores = {
    brando: "MODO BRANDO: tom de mentor encorajador. Aponte só os 2-3 erros mais importantes, com leveza, e valorize os acertos. Evite excesso de críticas.",
    medio: "MODO MÉDIO: equilíbrio entre cobrança e encorajamento. Aponte os erros relevantes com objetividade.",
    rigido: "MODO RÍGIDO: implacável. Não deixe passar nenhuma violação, por menor que seja. Cobre padrão de excelência, seja direto e severo (sem ofender), focando no crescimento.",
  };
  const rigorTxt = rigores[rigor] || rigores.medio;
  const metricasTxt = Object.entries(metricasPorLabel).map(([L, m]) => `Locutor ${L}: ${m.ritmo_ppm} ppm, pausas longas ${m.pausas}, ${m.hesitacao} muletas`).join("\n");

  const system = `Você é o MENTOR de comunicação do Marcelo. Avalie a fala dele de forma RÍGIDA e OBJETIVA, ancorado SOMENTE no manual abaixo. Não invente regras fora dele.

NÍVEL DE RIGOR DESTA ANÁLISE: ${rigorTxt}

${MANUAL}

INSTRUÇÕES:
- A CONVERSA vem separada por locutor (Locutor A, B, ...). Use o CONTEXTO informado pelo Marcelo para identificar QUAL locutor é ele. ATENÇÃO: as palavras de cada locutor são SÓ dele — nunca atribua ao Marcelo o que outro locutor disse. Se o contexto não permitir identificar, use o "${dominante}". Responda no campo "locutor" o NOME EXATO de um dos locutores listados (ex: Marcelo).
- Avalie SOMENTE a fala do locutor que é o Marcelo, contra as regras A1–A14. Use o resto da conversa só para entender a situação.
- Use o CONTEXTO para dar nuance (negociação, bronca, reunião etc.), mas o gabarito continua sendo o manual.
- Use o trecho EXATO da fala dele como evidência. Sem trecho, não acuse. Para erros, dê a reescrita melhor (curta).
- Reflexões da Parte B só quando houver gatilho verbal. Reflexão é PERGUNTA, nunca afirmação sobre o corpo.
- Comente ritmo e pausas no resumo (use as métricas do locutor que você identificou como Marcelo). Pausa pode ser estratégica (A6) ou travamento.
- Seja econômico nos itens: só com evidência real.
- PROFUNDIDADE (nível estudo, NÃO "cara de IA"): além de listar erros, faça uma LEITURA do conjunto. Qual o padrão psicológico por trás (vício em aprovação, medo do conflito, necessidade de controle, insegurança — use a camada de embasamento)? Como o contexto e a reação do outro pesaram? Conecte os pontos, cite evidências da fala, seja específico. Zero clichê, zero elogio vazio, zero conselho genérico.

Métricas por locutor (já calculadas):
${metricasTxt}

Responda APENAS com JSON válido, sem markdown, neste formato exato:
{
  "locutor": "Marcelo",
  "leitura": "ANÁLISE PROFUNDA do todo (4-6 frases densas, de mentor sênior): o padrão psicológico por trás dos erros, a raiz, como o contexto e o outro influenciaram. Não repita o resumo nem liste regras aqui.",
  "resumo": "2-3 frases diretas (diga em 1 frase como identificou o Marcelo)",
  "itens": [
    { "regra": "A6", "titulo": "nome curto", "tipo": "acerto" ou "erro", "trecho": "trecho exato da fala do Marcelo", "comentario": "por que", "reescrita": "como dizer melhor (só se erro)" }
  ],
  "reflexoes": [ "pergunta de auto-observação" ]
}`;

  const user = `CONTEXTO DO MARCELO: ${contexto || "(não informado)"}

CONVERSA (separada por locutor):
${turnos}`;

  const body = { model: MENTOR_MODEL, max_tokens: 3200, system, messages: [{ role: "user", content: user }] };
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
  return { resumo: "Não consegui interpretar o veredicto.", itens: [], reflexoes: [] };
}
