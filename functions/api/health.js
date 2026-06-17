// /api/health — diagnóstico rápido. Diz se os segredos foram lidos (sem revelar valor).
export async function onRequestGet(context) {
  const { env } = context;
  return new Response(JSON.stringify({
    ok: true,
    assembly_key_set: !!env.ASSEMBLYAI_API_KEY,
    anthropic_key_set: !!env.ANTHROPIC_API_KEY,
  }), { headers: { "content-type": "application/json" } });
}
