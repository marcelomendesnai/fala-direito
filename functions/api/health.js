// /api/health — diagnóstico. Tolera espaços no nome das vars.
function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) { if (k.trim() === name) return env[k]; }
  return undefined;
}
export async function onRequestGet(context) {
  const { env } = context;
  let env_keys = [];
  try { env_keys = Object.keys(env || {}); } catch (e) {}
  return new Response(JSON.stringify({
    ok: true,
    eleven_key_set: !!readKey(env, "ELEVENLABS_API_KEY"),
    anthropic_key_set: !!readKey(env, "ANTHROPIC_API_KEY"),
    app_password_set: !!readKey(env, "APP_PASSWORD"),
    env_keys,
  }), { headers: { "content-type": "application/json" } });
}
