import { MANUAL } from "./_manual.js";
import { authorize, json, readKey } from "./_history-db.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!authorize(request, env)) return json({ erro: "Senha incorreta." }, 401);
  const key = readKey(env, "ANTHROPIC_API_KEY");
  if (!key) return json({ erro: "Chave da Anthropic não configurada." }, 500);
  try {
    const body = await request.json();
    const turnos = String(body.turnos || "").trim();
    const plano = body.plano && typeof body.plano === "object" ? body.plano : {};
    const memoria = String(body.memoria || "").slice(0, 16000);
    const metricas = body.metricas && typeof body.metricas === "object" ? body.metricas : {};
    const dominante = String(body.dominante || "A");
    if (!turnos) return json({ erro: "Sem transcrição para avaliar." }, 400);

    const system = `Você avalia um ENSAIO de comunicação de Marcelo. Compare a fala com o objetivo, a estrutura e cada etapa do plano aprovado; depois avalie as regras pessoais e hábitos de entrega. O ensaio serve para aprender: ele NÃO é uma conversa real, NÃO confirma padrão recorrente e NÃO entra nas médias oficiais.

Você pode apontar falhas gerais de estratégia, ordem, pedido ou tratamento de objeções dentro de "comparacao", mesmo quando não correspondem a A1–A14. Não transforme essas orientações em novas regras pessoais. Nos "itens", use somente regras A1–A14 com evidência literal.

${MANUAL}

Seja exigente, mas use evidência literal. Responda APENAS com JSON válido:
{
  "locutor":"rótulo exato do locutor avaliado",
  "resumo":"síntese do ensaio",
  "macro":{
    "mensagem":{"status":"passou|parcial|não passou", "titulo":"aderência ao objetivo", "avaliacao":"texto", "evidencia":"trecho"},
    "estrutura":{"status":"boa|ajustar", "avaliacao":"texto", "evidencia":"trecho"},
    "entrega":{"status":"boa|ajustar", "avaliacao":"texto"}
  },
  "comparacao":{
    "aderencia":0,
    "resumo":"comparação direta com o plano",
    "etapas":[{"etapa":"abertura|mensagem central|argumentos|pedido|objeções", "status":"cumpriu|parcial|não cumpriu|não aplicável", "evidencia":"trecho", "ajuste":"correção"}],
    "proxima_tentativa":"instrução específica"
  },
  "itens":[{"area":"entrega", "regra":"A1", "titulo":"texto", "tipo":"acerto|erro|atenção", "nivel":"treino", "trecho":"trecho exato", "impacto":"efeito", "comentario":"motivo", "reescrita":"alternativa"}],
  "contagens":{"muletas":[],"eu_acho":0},
  "plano":{"foco":"um foco", "por_que":"motivo", "acao":"próximo ensaio", "meta":"meta observável"},
  "reflexoes":[]
}`;
    const user = `PLANO APROVADO:\n${JSON.stringify(plano)}\n\nPERFIL REAL (apenas para personalizar; não misture o ensaio ao histórico):\n${memoria || "Sem histórico suficiente."}\n\nMÉTRICAS DO ENSAIO:\n${JSON.stringify(metricas)}\n\nTRANSCRIÇÃO DO ENSAIO:\n${turnos}`;
    const verdict = await callClaude(key, system, user);
    let locutor = String(verdict.locutor || dominante).trim();
    if (!metricas[locutor]) locutor = dominante;
    const itens = Array.isArray(verdict.itens) ? verdict.itens : [];
    return json({
      modo: "treino",
      placar: { acertos: itens.filter((x) => x.tipo === "acerto").length, erros: itens.filter((x) => x.tipo === "erro").length, regras_avaliadas: 14 },
      resumo: verdict.resumo || "—",
      macro: verdict.macro || {},
      comparacao: verdict.comparacao || {},
      metricas: metricas[locutor] || { ritmo_ppm: 0, pausas: "—", hesitacao: 0 },
      itens,
      contagens: verdict.contagens || {},
      padrao: { nivel: "sem padrão", leitura: "Ensaio não é usado como evidência de padrão real.", evidencias: [] },
      plano: verdict.plano || {},
      reflexoes: verdict.reflexoes || [],
      voce: { locutor, como: "treino" },
      _sessao: { turnos, metricasPorLabel: metricas, dominante },
    });
  } catch (e) {
    return json({ erro: "Falha ao avaliar o ensaio: " + e.message }, 500);
  }
}

async function callClaude(key, system, user) {
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 3400, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error("Mentor retornou " + r.status + ": " + (await r.text()).slice(0, 180));
  const data = await r.json();
  const text = (data.content || []).map((x) => x.text || "").join("").trim();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("A avaliação não veio em formato válido.");
  return JSON.parse(text.slice(start, end + 1));
}
