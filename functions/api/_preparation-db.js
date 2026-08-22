export async function ensurePreparationSchema(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS preparations (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      title TEXT,
      brief TEXT NOT NULL,
      plan_json TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft'
    )
  `).run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS practice_attempts (
      id TEXT PRIMARY KEY,
      preparation_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      transcript TEXT NOT NULL,
      plan_json TEXT NOT NULL DEFAULT '{}',
      metrics_json TEXT NOT NULL DEFAULT '{}',
      analysis_json TEXT NOT NULL DEFAULT '{}'
    )
  `).run();
  try {
    await db.prepare("ALTER TABLE practice_attempts ADD COLUMN plan_json TEXT NOT NULL DEFAULT '{}'").run();
  } catch (e) {
    if (!String(e?.message || e).toLowerCase().includes("duplicate column")) throw e;
  }
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_preparations_updated ON preparations(updated_at DESC)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_attempts_preparation ON practice_attempts(preparation_id, created_at DESC)").run();
}

export function parseJson(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}

export function preparationRow(row) {
  return {
    id: row.id,
    data: row.created_at,
    atualizada_em: row.updated_at,
    titulo: row.title || "Preparação sem título",
    briefing: row.brief,
    plano: parseJson(row.plan_json, {}),
    status: row.status || "draft",
    tentativas: Number(row.attempt_count || 0),
    _sync: { state: "synced", updated_at: row.updated_at || null },
  };
}
