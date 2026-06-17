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
    assembly_key_set: !!readKey(env, "ASSEMBLYAI_API_KEY"),
    anthropic_key_set: !!readKey(env, "ANTHROPIC_API_KEY"),
    env_keys,
  }), { headers: { "content-type": "application/json" } });
}
