// /api/analyze — Scribe (transcrição+diarização) -> identifica Marcelo via contexto -> Mentor.
// Devolve _sessao (turnos + métricas + dominante) p/ permitir reanalisar sem re-transcrever.
import { chamarMentor } from "./_mentor.js";

const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const STT_MODEL = "scribe_v2";
const MULETAS = ["né", "tipo", "então", "aí", "sabe", "entendeu", "cara"];

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const elevenKey = readKey(env, "ELEVENLABS_API_KEY");
    const anthropicKey = readKey(env, "ANTHROPIC_API_KEY");
    if (!elevenKey || !anthropicKey) return json({ erro: "Chaves de API não configuradas (ELEVENLABS_API_KEY / ANTHROPIC_API_KEY)." }, 500);
    const appPass = readKey(env, "APP_PASSWORD");
    if (appPass && (request.headers.get("x-app-pass") || "") !== appPass) return json({ erro: "Senha incorreta." }, 401);

    const form = await request.formData();
    const file = form.get("audio");
    if (!file) return json({ erro: "Nenhum áudio recebido." }, 400);
    const rigor = (form.get("rigor") || "medio").toString();
    const contexto = (form.get("contexto") || "").toString().trim();

    const stt = await transcrever(file, elevenKey);
    if (stt.erro) return json({ erro: stt.erro }, stt.status || 502);
    const words = stt.words;

    const sid = (w) => w.speaker_id || "speaker_0";
    const ordem = [];
    for (const w of words) { const s = sid(w); if (!ordem.includes(s)) ordem.push(s); }
    const label = {};
    ordem.forEach((s, i) => { label[s] = String.fromCharCode(65 + i); });
    const labelOf = (w) => label[sid(w)];

    const porLabel = {};
    for (const w of words) { const L = labelOf(w); (porLabel[L] = porLabel[L] || []).push(w); }
    const labels = Object.keys(porLabel);
    const dominante = labels.slice().sort((a, b) => porLabel[b].length - porLabel[a].length)[0];
    const metricasPorLabel = {};
    for (const L of labels) metricasPorLabel[L] = calcMetricas(words, L, labelOf);

    const turnos = construirTurnos(words, labelOf);

    const veredicto = await chamarMentor({ turnos, contexto, dominante, metricasPorLabel, rigor, key: anthropicKey });
    let locutor = (veredicto.locutor || "").toUpperCase().replace(/[^A-Z]/g, "") || dominante;
    if (!porLabel[locutor]) locutor = dominante;

    const itens = veredicto.itens || [];
    return json({
      placar: { acertos: itens.filter((i) => i.tipo === "acerto").length, erros: itens.filter((i) => i.tipo === "erro").length, regras_avaliadas: 13 },
      resumo: veredicto.resumo || "—",
      metricas: metricasPorLabel[locutor] || { ritmo_ppm: 0, pausas: "—", hesitacao: 0 },
      itens,
      reflexoes: veredicto.reflexoes || [],
      voce: { locutor, como: contexto ? "contexto" : "auto" },
      _sessao: { turnos, metricasPorLabel, dominante },
    });
  } catch (e) {
    return json({ erro: "Falha inesperada: " + e.message }, 500);
  }
}

async function transcrever(file, key) {
  const f = new FormData();
  f.append("file", file, "audio.webm");
  f.append("model_id", STT_MODEL);
  f.append("language_code", "pt");
  f.append("diarize", "true");
  f.append("timestamps_granularity", "word");
  const r = await fetch(STT_URL, { method: "POST", headers: { "xi-api-key": key }, body: f });
  if (!r.ok) { const d = await r.text(); return { erro: "Falha na transcrição (ElevenLabs " + r.status + "): " + d.slice(0, 150) }; }
  const stt = await r.json();
  const words = (stt.words || []).filter((w) => w.type === "word" && w.text && w.text.trim());
  if (!words.length) return { erro: "Não consegui transcrever. Áudio muito curto ou sem voz clara?", status: 422 };
  return { words };
}

function construirTurnos(words, labelOf) {
  const turnos = [];
  let cur = null;
  for (const w of words) {
    const L = labelOf(w);
    if (!cur || cur.L !== L) { cur = { L, txt: w.text }; turnos.push(cur); }
    else cur.txt += " " + w.text;
  }
  return turnos.map((t) => `Locutor ${t.L}: ${t.txt}`).join("\n").replace(/\s+([.,!?;:])/g, "$1");
}

// pausas contam SÓ dentro da fala contínua do alvo (gap onde a palavra anterior também é dele).
function calcMetricas(allWords, alvo, labelOf) {
  const sorted = allWords.slice().sort((a, b) => (a.start || 0) - (b.start || 0));
  let talkSec = 0, pausas = 0, maior = 0, count = 0;
  for (let i = 0; i < sorted.length; i++) {
    const w = sorted[i];
    if (labelOf(w) !== alvo) continue;
    count++;
    if (w.start != null && w.end != null) talkSec += Math.max(0, w.end - w.start);
    if (i > 0 && labelOf(sorted[i - 1]) === alvo) {
      const gap = (w.start || 0) - (sorted[i - 1].end || 0);
      if (gap > 0 && gap < 2) talkSec += gap;
      if (gap > 1.2) { pausas++; if (gap > maior) maior = gap; }
    }
  }
  const ritmo_ppm = talkSec > 0 ? Math.round(count / (talkSec / 60)) : 0;
  const txt = " " + sorted.filter((w) => labelOf(w) === alvo).map((w) => w.text).join(" ").toLowerCase() + " ";
  let hesitacao = 0;
  for (const m of MULETAS) { const re = new RegExp("\\b" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"); hesitacao += (txt.match(re) || []).length; }
  return { ritmo_ppm, pausas: pausas ? `${pausas} (maior ${maior.toFixed(1)}s)` : "nenhuma longa", hesitacao };
}

function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) { if (k.trim() === name) return env[k]; }
  return undefined;
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
