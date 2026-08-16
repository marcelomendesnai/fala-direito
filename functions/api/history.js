// /api/history — histórico centralizado no D1. O navegador mantém apenas uma cópia local.
import { ANALYSIS_VERSION, authorize, ensureSchema, getDb, json, rowToHistory } from "./_history-db.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (!authorize(request, env)) return json({ erro: "Senha incorreta." }, 401);
  const db = getDb(env);
  if (!db) return json({ erro: "Banco D1 ainda não está conectado ao app.", codigo: "DB_NOT_BOUND" }, 503);

  try {
    await ensureSchema(db);
    if (request.method === "GET") return listar(db);
    if (request.method === "POST") return salvar(request, db);
    if (request.method === "PATCH") return atualizar(request, db);
    if (request.method === "DELETE") return apagar(request, db);
    return json({ erro: "Método não permitido." }, 405);
  } catch (e) {
    return json({ erro: "Falha no histórico: " + e.message }, 500);
  }
}

async function listar(db) {
  const result = await db.prepare("SELECT * FROM conversations ORDER BY created_at DESC LIMIT 100").all();
  return json({ historico: (result.results || []).map(rowToHistory), analysis_version: ANALYSIS_VERSION });
}

async function salvar(request, db) {
  const body = await request.json();
  const h = body.historico || {};
  const session = h._sessao || {};
  const id = String(h.id || "").slice(0, 120);
  const transcript = String(session.turnos || "").trim();
  if (!id || !transcript) return json({ erro: "Histórico sem identificador ou transcrição." }, 400);

  const createdAt = validDate(h.data) || new Date().toISOString();
  const now = new Date().toISOString();
  const version = h.analysis_version || (h.macro ? "v0.40" : "legado");
  const source = body.origem === "migracao_local" ? "migracao_local" : "app";
  const values = [
    id, createdAt, String(h.nome || "").slice(0, 180), String(h.contexto || "").slice(0, 4000),
    String(h.rigor || "medio"), transcript, JSON.stringify(session.metricasPorLabel || {}),
    String(session.dominante || "A"), JSON.stringify(h), version,
    h.reanalyzed_at || null, source, now,
  ];
  const conflict = source === "migracao_local" ? "" : `
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      context = excluded.context,
      rigor = excluded.rigor,
      transcript = excluded.transcript,
      metrics_json = excluded.metrics_json,
      dominant = excluded.dominant,
      analysis_json = excluded.analysis_json,
      analysis_version = excluded.analysis_version,
      reanalyzed_at = excluded.reanalyzed_at,
      source = excluded.source,
      updated_at = excluded.updated_at`;
  await db.prepare(`
    INSERT ${source === "migracao_local" ? "OR IGNORE" : ""} INTO conversations
      (id, created_at, name, context, rigor, transcript, metrics_json, dominant,
       analysis_json, analysis_version, reanalyzed_at, source, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ${conflict}
  `).bind(...values).run();

  const row = await db.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();
  return json({ ok: true, historico: rowToHistory(row), precisa_reavaliar: row.analysis_version !== ANALYSIS_VERSION });
}

async function atualizar(request, db) {
  const body = await request.json();
  const id = String(body.id || "");
  if (!id) return json({ erro: "Identificador ausente." }, 400);
  if (Object.hasOwn(body, "nome")) {
    await db.prepare("UPDATE conversations SET name = ?, updated_at = ? WHERE id = ?")
      .bind(String(body.nome || "").slice(0, 180), new Date().toISOString(), id).run();
  }
  if (Object.hasOwn(body, "chat")) {
    const row = await db.prepare("SELECT analysis_json FROM conversations WHERE id = ?").bind(id).first();
    if (row) {
      let analysis = {};
      try { analysis = JSON.parse(row.analysis_json || "{}"); } catch (_) {}
      analysis.chat = Array.isArray(body.chat) ? body.chat.slice(-40) : [];
      await db.prepare("UPDATE conversations SET analysis_json = ?, updated_at = ? WHERE id = ?")
        .bind(JSON.stringify(analysis), new Date().toISOString(), id).run();
    }
  }
  return json({ ok: true });
}

async function apagar(request, db) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") || "";
  if (!id) return json({ erro: "Identificador ausente." }, 400);
  await db.prepare("DELETE FROM conversations WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

function validDate(value) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}
