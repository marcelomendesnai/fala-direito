// /api/rejudge — reanalisa a MESMA conversa com um contexto corrigido (só roda o Mentor).
import { chamarMentor } from "./_mentor.js";

function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) { if (k.trim() === name) return env[k]; }
  return undefined;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const anthropicKey = readKey(env, "ANTHROPIC_API_KEY");
    if (!anthropicKey) return json({ erro: "Chave da Anthropic não configurada." }, 500);
    const appPass = readKey(env, "APP_PASSWORD");
    if (appPass && (request.headers.get("x-app-pass") || "") !== appPass) return json({ erro: "Senha incorreta." }, 401);

    const body = await request.json();
    const turnos = body.turnos || "";
    const metricasPorLabel = body.metricas || {};
    const dominante = body.dominante || "A";
    const contexto = (body.contexto || "").toString().trim();
    const rigor = (body.rigor || "medio").toString();
    if (!turnos) return json({ erro: "Sem transcrição para reanalisar." }, 400);

    const veredicto = await chamarMentor({ turnos, contexto, dominante, metricasPorLabel, rigor, key: anthropicKey });
    let locutor = (veredicto.locutor || "").trim();
    if (!metricasPorLabel[locutor]) locutor = dominante;

    const itens = veredicto.itens || [];
    return json({
      placar: { acertos: itens.filter((i) => i.tipo === "acerto").length, erros: itens.filter((i) => i.tipo === "erro").length, regras_avaliadas: 14 },
      resumo: veredicto.resumo || "—",
      metricas: metricasPorLabel[locutor] || { ritmo_ppm: 0, pausas: "—", hesitacao: 0 },
      itens,
      reflexoes: veredicto.reflexoes || [],
      voce: { locutor, como: contexto ? "contexto" : "auto" },
      _sessao: { turnos, metricasPorLabel, dominante },
    });
  } catch (e) {
    return json({ erro: "Falha: " + e.message }, 500);
  }
}
