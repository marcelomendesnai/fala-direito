// /api/health — diagnóstico. Diz se os segredos foram lidos e lista os NOMES das vars (sem valor).
export async function onRequestGet(context) {
  const { env } = context;
  let env_keys = [];
  try { env_keys = Object.keys(env || {}); } catch (e) {}
  return new Response(JSON.stringify({
    ok: true,
    assembly_key_set: !!env.ASSEMBLYAI_API_KEY,
    anthropic_key_set: !!env.ANTHROPIC_API_KEY,
    env_keys,
  }), { headers: { "content-type": "application/json" } });
}
