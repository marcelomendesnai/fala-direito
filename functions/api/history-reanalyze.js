// /api/history-reanalyze — reaplica o mentor atual sobre uma transcrição já salva.
import { chamarMentor, normalizarTituloConversa } from "./_mentor.js";
import { ANALYSIS_VERSION, authorize, ensureSchema, getDb, json, readKey, rowToHistory } from "./_history-db.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!authorize(request, env)) return json({ erro: "Senha incorreta." }, 401);
  const db = getDb(env);
  if (!db) return json({ erro: "Banco D1 ainda não está conectado ao app.", codigo: "DB_NOT_BOUND" }, 503);
  const anthropicKey = readKey(env, "ANTHROPIC_API_KEY");
  if (!anthropicKey) return json({ erro: "Chave da Anthropic não configurada." }, 500);

  try {
    await ensureSchema(db);
    const body = await request.json();
    const id = String(body.id || "");
    const row = await db.prepare("SELECT * FROM conversations WHERE id = ? AND deleted_at IS NULL").bind(id).first();
    if (!row) return json({ erro: "Conversa não encontrada." }, 404);
    if (!row.transcript) return json({ erro: "Esta conversa não possui transcrição para reavaliar." }, 400);

    const metricasPorLabel = parse(row.metrics_json, {});
    const dominante = row.dominant || "A";
    const memoria = await montarMemoria(db, id);
    const veredicto = await chamarMentor({
      turnos: row.transcript,
      contexto: row.context || "",
      dominante,
      metricasPorLabel,
      rigor: row.rigor || "medio",
      key: anthropicKey,
      memoria,
    });
    let locutor = String(veredicto.locutor || "").trim();
    if (!metricasPorLabel[locutor]) locutor = dominante;
    const itens = Array.isArray(veredicto.itens) ? veredicto.itens : [];
    const previous = parse(row.analysis_json, {});
    const analysis = Object.assign({}, previous, {
      nome: row.name || previous.nome || normalizarTituloConversa(veredicto.titulo_conversa),
      placar: {
        acertos: itens.filter((i) => i.tipo === "acerto").length,
        erros: itens.filter((i) => i.tipo === "erro").length,
        regras_avaliadas: 14,
      },
      resumo: veredicto.resumo || "—",
      macro: veredicto.macro || {},
      metricas: metricasPorLabel[locutor] || previous.metricas || { ritmo_ppm: 0, pausas: "—", hesitacao: 0 },
      itens,
      contagens: veredicto.contagens || {},
      padrao: veredicto.padrao || {},
      plano: veredicto.plano || {},
      reflexoes: veredicto.reflexoes || [],
      voce: { locutor, como: row.context ? "contexto" : "auto" },
      analysis_version: ANALYSIS_VERSION,
      reanalyzed_at: new Date().toISOString(),
    });
    const now = new Date().toISOString();
    await db.prepare(`
      UPDATE conversations
      SET analysis_json = ?, analysis_version = ?, reanalyzed_at = ?, updated_at = ?
      WHERE id = ?
    `).bind(JSON.stringify(analysis), ANALYSIS_VERSION, now, now, id).run();
    const updated = await db.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();
    return json({ ok: true, historico: rowToHistory(updated) });
  } catch (e) {
    return json({ erro: "Falha ao reavaliar: " + e.message }, 500);
  }
}

async function montarMemoria(db, currentId) {
  const result = await db.prepare(`
    SELECT created_at, name, analysis_json FROM conversations
    WHERE id <> ? ORDER BY created_at DESC LIMIT 6
  `).bind(currentId).all();
  const linhas = [];
  for (const row of result.results || []) {
    const analysis = parse(row.analysis_json, {});
    const evidencias = (analysis.itens || [])
      .filter((i) => ["erro", "atenção", "atencao"].includes(i.tipo) && i.regra && i.trecho)
      .slice(0, 3)
      .map((i) => `${i.regra}: “${String(i.trecho).slice(0, 160)}”`);
    if (evidencias.length) linhas.push(`- ${row.name || row.created_at}: ${evidencias.join(" | ")}`);
  }
  return linhas.length
    ? `HISTÓRICO DE EVIDÊNCIAS (use apenas para confirmar recorrência):\n${linhas.join("\n")}`
    : "Sem trechos históricos suficientes.";
}

function parse(value, fallback) {
  try { return JSON.parse(value); } catch (_) { return fallback; }
}
