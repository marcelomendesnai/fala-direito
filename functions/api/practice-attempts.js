import { authorize, getDb, json } from "./_history-db.js";
import { ensurePreparationSchema } from "./_preparation-db.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!authorize(request, env)) return json({ erro: "Senha incorreta." }, 401);
  const db = getDb(env);
  if (!db) return json({ erro: "Banco D1 ainda não está conectado ao app." }, 503);
  try {
    await ensurePreparationSchema(db);
    const body = await request.json();
    const tentativa = body.tentativa || {};
    const id = String(tentativa.id || "").slice(0, 120);
    const preparationId = String(tentativa.preparation_id || "").slice(0, 120);
    const transcript = String(tentativa.transcricao || "").trim();
    if (!id || !preparationId || !transcript) return json({ erro: "Tentativa incompleta." }, 400);
    const exists = await db.prepare("SELECT id FROM preparations WHERE id = ?").bind(preparationId).first();
    if (!exists) return json({ erro: "Preparação não encontrada." }, 404);
    await db.prepare(`
      INSERT OR REPLACE INTO practice_attempts
        (id, preparation_id, created_at, transcript, plan_json, metrics_json, analysis_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      preparationId,
      new Date().toISOString(),
      transcript,
      JSON.stringify(tentativa.plano || {}),
      JSON.stringify(tentativa.metricas || {}),
      JSON.stringify(tentativa.analise || {})
    ).run();
    return json({ ok: true });
  } catch (e) {
    return json({ erro: "Falha ao salvar o ensaio: " + e.message }, 500);
  }
}
