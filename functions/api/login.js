// /api/login — valida a senha do app contra APP_PASSWORD (env). Não revela a senha.
function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) { if (k.trim() === name) return env[k]; }
  return undefined;
}
export async function onRequestPost(context) {
  const { request, env } = context;
  const appPass = readKey(env, "APP_PASSWORD");
  if (!appPass) return new Response(JSON.stringify({ ok: false, erro: "Senha não configurada no servidor." }), { headers: { "content-type": "application/json" } });
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const ok = (body.senha || "") === appPass;
  return new Response(JSON.stringify({ ok }), { headers: { "content-type": "application/json" } });
}
