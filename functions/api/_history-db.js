export const ANALYSIS_VERSION = "v0.41";

export function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) if (k.trim() === name) return env[k];
  return undefined;
}

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function authorize(request, env) {
  const appPass = readKey(env, "APP_PASSWORD");
  return !appPass || (request.headers.get("x-app-pass") || "") === appPass;
}

export function getDb(env) {
  return env.DB || null;
}

export async function ensureSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      name TEXT,
      context TEXT,
      rigor TEXT NOT NULL DEFAULT 'medio',
      transcript TEXT NOT NULL,
      metrics_json TEXT NOT NULL DEFAULT '{}',
      dominant TEXT,
      analysis_json TEXT NOT NULL DEFAULT '{}',
      analysis_version TEXT,
      reanalyzed_at TEXT,
      source TEXT NOT NULL DEFAULT 'app',
      updated_at TEXT NOT NULL
    )
  `).run();

  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_conversations_created_at
      ON conversations(created_at DESC)
  `).run();
}

export function rowToHistory(row) {
  const analysis = safeParse(row.analysis_json, {});
  const metricasPorLabel = safeParse(row.metrics_json, {});
  return Object.assign({}, analysis, {
    id: row.id,
    data: row.created_at,
    nome: row.name || analysis.nome || "",
    contexto: row.context || "",
    rigor: row.rigor || "medio",
    analysis_version: row.analysis_version || "legado",
    reanalyzed_at: row.reanalyzed_at || null,
    _sessao: {
      turnos: row.transcript,
      metricasPorLabel,
      dominante: row.dominant || "A",
    },
  });
}

export function safeParse(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}
