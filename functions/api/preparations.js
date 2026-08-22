import { authorize, getDb, json } from "./_history-db.js";
import { ensurePreparationSchema, preparationRow } from "./_preparation-db.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (!authorize(request, env)) return json({ erro: "Senha incorreta." }, 401);
  const db = getDb(env);
  if (!db) return json({ erro: "Banco D1 ainda não está conectado ao app." }, 503);
  try {
    await ensurePreparationSchema(db);
    if (request.method === "GET") {
      const result = await db.prepare(`
        SELECT p.*, COUNT(a.id) AS attempt_count
        FROM preparations p LEFT JOIN practice_attempts a ON a.preparation_id = p.id
        GROUP BY p.id ORDER BY p.updated_at DESC LIMIT 40
      `).all();
      return json({ preparacoes: (result.results || []).map(preparationRow) });
    }
    if (request.method !== "POST") return json({ erro: "Método não permitido." }, 405);
    const body = await request.json();
    const p = body.preparacao || {};
    const id = String(p.id || "").slice(0, 120);
    const brief = String(p.briefing || "").trim().slice(0, 12000);
    if (!id || !brief) return json({ erro: "Preparação sem identificador ou briefing." }, 400);
    const createdAt = validDate(p.data) || new Date().toISOString();
    const now = new Date().toISOString();
    const plan = p.plano && typeof p.plano === "object" ? p.plano : {};
    const title = String(plan.titulo || p.titulo || "Preparação sem título").slice(0, 180);
    await db.prepare(`
      INSERT INTO preparations (id, created_at, updated_at, title, brief, plan_json, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        updated_at = excluded.updated_at,
        title = excluded.title,
        brief = excluded.brief,
        plan_json = excluded.plan_json,
        status = excluded.status
    `).bind(id, createdAt, now, title, brief, JSON.stringify(plan), String(p.status || "draft")).run();
    const row = await db.prepare(`
      SELECT p.*, (SELECT COUNT(*) FROM practice_attempts a WHERE a.preparation_id = p.id) AS attempt_count
      FROM preparations p WHERE p.id = ?
    `).bind(id).first();
    return json({ ok: true, preparacao: preparationRow(row) });
  } catch (e) {
    return json({ erro: "Falha nas preparações: " + e.message }, 500);
  }
}

function validDate(value) {
  const d = new Date(value || "");
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
