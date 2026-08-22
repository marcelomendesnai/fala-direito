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
    const briefing = String(body.briefing || "").trim();
    const ajuste = String(body.ajuste || "").trim();
    const planoAtual = body.plano_atual && typeof body.plano_atual === "object" ? body.plano_atual : null;
    const memoria = String(body.memoria || "").slice(0, 16000);
    if (briefing.length < 20) return json({ erro: "Explique um pouco melhor a reunião e o que pretende conseguir." }, 400);

    const system = `Você prepara Marcelo para conversas, reuniões, cobranças, negociações e pedidos. Crie um plano prático, natural e firme, usando as regras pessoais abaixo e os erros reais fornecidos. Não teatralize e não invente fatos.

REGRA CRÍTICA: Marcelo pode possuir informações que você ainda não recebeu. Quando algo necessário estiver ausente, registre em "pendencias". Nunca preencha lacunas como se fossem fatos. Se houver um plano anterior e um pedido de ajuste, preserve as decisões já aprovadas e altere somente o necessário.

Planeje do macro para o micro: objetivo da reunião, ordem da mensagem, abertura, argumentos, pedido, objeções e só então hábitos de entrega. Use o histórico real para personalizar cuidados, mas não presuma que um erro antigo ocorrerá nesta reunião. Você pode aplicar princípios gerais de preparação e negociação no plano, sem inventar novas regras pessoais nem alterar o manual A1–A14.

${MANUAL}

Responda APENAS com JSON válido neste formato:
{
  "titulo": "3 a 8 palavras, sem nomes de pessoas",
  "objetivo": "resultado concreto desejado",
  "abertura": "frase exata sugerida para começar",
  "mensagem_central": "posição principal em uma frase",
  "argumentos": ["argumento em ordem"],
  "pedido": "pedido, decisão ou fechamento exato",
  "objecoes": [{"objecao":"objeção provável", "resposta":"resposta recomendada"}],
  "evitar": ["frase ou hábito a evitar considerando o perfil real"],
  "pendencias": ["informação que ainda precisa ser confirmada com Marcelo"],
  "checklist": ["item observável para o ensaio"]
}`;
    const user = `BRIEFING DE MARCELO:\n${briefing}\n\nPERFIL REAL DE COMUNICAÇÃO:\n${memoria || "Sem histórico suficiente."}\n\nPLANO ATUAL:\n${planoAtual ? JSON.stringify(planoAtual) : "Ainda não existe."}\n\nPEDIDO DE AJUSTE:\n${ajuste || "Crie a primeira versão do plano."}`;
    const plan = await callClaude(key, system, user);
    return json({ plano: normalizePlan(plan) });
  } catch (e) {
    return json({ erro: "Falha ao preparar: " + e.message }, 500);
  }
}

async function callClaude(key, system, user) {
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2600, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error("Mentor retornou " + r.status + ": " + (await r.text()).slice(0, 180));
  const data = await r.json();
  const text = (data.content || []).map((x) => x.text || "").join("").trim();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("O plano não veio em formato válido.");
  return JSON.parse(text.slice(start, end + 1));
}

function normalizePlan(p) {
  const arr = (v) => Array.isArray(v) ? v.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 12) : [];
  return {
    titulo: String(p?.titulo || "Preparação da conversa").replace(/\bMarcelo\b/gi, "").trim().slice(0, 100),
    objetivo: String(p?.objetivo || "").trim(),
    abertura: String(p?.abertura || "").trim(),
    mensagem_central: String(p?.mensagem_central || "").trim(),
    argumentos: arr(p?.argumentos),
    pedido: String(p?.pedido || "").trim(),
    objecoes: Array.isArray(p?.objecoes) ? p.objecoes.slice(0, 10).map((x) => ({ objecao: String(x?.objecao || "").trim(), resposta: String(x?.resposta || "").trim() })).filter((x) => x.objecao || x.resposta) : [],
    evitar: arr(p?.evitar),
    pendencias: arr(p?.pendencias),
    checklist: arr(p?.checklist),
  };
}
