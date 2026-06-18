// /api/transcribe-convo — transcreve a conversa (Scribe) e devolve as palavras já
// rotuladas por locutor (A/B/C). O cliente monta os turnos, deixa o Marcelo corrigir
// quem falou cada parte, e depois manda pro /api/rejudge (sem re-transcrever).
const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const STT_MODEL = "scribe_v2";

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
    const key = readKey(env, "ELEVENLABS_API_KEY");
    if (!key) return json({ erro: "Chave da ElevenLabs não configurada." }, 500);
    const appPass = readKey(env, "APP_PASSWORD");
    if (appPass && (request.headers.get("x-app-pass") || "") !== appPass) return json({ erro: "Senha incorreta." }, 401);

    const form = await request.formData();
    const file = form.get("audio");
    if (!file) return json({ erro: "Nenhum áudio recebido." }, 400);

    const f = new FormData();
    f.append("file", file, "audio.webm");
    f.append("model_id", STT_MODEL);
    f.append("language_code", "pt");
    f.append("diarize", "true");
    f.append("timestamps_granularity", "word");
    const n = parseInt(form.get("num_speakers") || "0", 10);
    if (n >= 1 && n <= 12) f.append("num_speakers", String(n));
    const r = await fetch(STT_URL, { method: "POST", headers: { "xi-api-key": key }, body: f });
    if (!r.ok) { const d = await r.text(); return json({ erro: "Falha na transcrição (ElevenLabs " + r.status + "): " + d.slice(0, 150) }, 502); }
    const stt = await r.json();
    const raw = (stt.words || []).filter((w) => w.type === "word" && w.text && w.text.trim());
    if (!raw.length) return json({ erro: "Não consegui transcrever. Áudio muito curto ou sem voz clara?" }, 422);

    const sid = (w) => w.speaker_id || "speaker_0";
    const ordem = [];
    for (const w of raw) { const s = sid(w); if (!ordem.includes(s)) ordem.push(s); }
    const label = {};
    ordem.forEach((s, i) => { label[s] = String.fromCharCode(65 + i); });

    const words = raw.map((w) => ({ t: w.text, s: w.start, e: w.end, spk: label[sid(w)] }));
    return json({ words });
  } catch (e) {
    return json({ erro: "Falha: " + e.message }, 500);
  }
}
