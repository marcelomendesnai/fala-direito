// /api/transcribe — transcrição simples (sem diarização) p/ o "ditar contexto".
// Usa ElevenLabs Scribe e devolve só o texto.
const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";

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
    f.append("file", file, "ctx.webm");
    f.append("model_id", "scribe_v2");
    f.append("language_code", "pt");
    const r = await fetch(STT_URL, { method: "POST", headers: { "xi-api-key": key }, body: f });
    if (!r.ok) { const d = await r.text(); return json({ erro: "Falha na transcrição (" + r.status + "): " + d.slice(0, 120) }, 502); }
    const stt = await r.json();
    return json({ text: (stt.text || "").trim() });
  } catch (e) {
    return json({ erro: "Falha: " + e.message }, 500);
  }
}
