// /api/health — verifica conexões reais sem gerar conteúdo nem consumir análise.
function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) if (k.trim() === name) return env[k];
  return undefined;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function authorize(request, env) {
  const appPass = readKey(env, "APP_PASSWORD");
  return !appPass || (request.headers.get("x-app-pass") || "") === appPass;
}

async function checkExternal({ url, headers, configured, okDetail }) {
  if (!configured) return { status: "error", detail: "Chave não configurada", latency_ms: null };
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const latency = Date.now() - started;
    if (response.ok) return { status: "ok", detail: okDetail, latency_ms: latency };
    if (response.status === 429) return { status: "warn", detail: "Serviço respondeu, mas está limitado agora", latency_ms: latency };
    const authFailure = response.status === 401 || response.status === 403;
    return { status: authFailure ? "error" : "warn", detail: `${authFailure ? "Acesso recusado" : "Serviço respondeu com falha"} (HTTP ${response.status})`, latency_ms: latency };
  } catch (e) {
    return { status: "error", detail: e?.name === "AbortError" ? "Tempo de resposta excedido" : "Serviço indisponível", latency_ms: Date.now() - started };
  } finally {
    clearTimeout(timeout);
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!authorize(request, env)) return json({ erro: "Senha incorreta." }, 401);

  const checks = {
    backend: { status: "ok", detail: "Aplicativo e funções respondendo", latency_ms: 0 },
  };

  const dbStarted = Date.now();
  try {
    if (!env.DB) throw new Error("DB_NOT_BOUND");
    await env.DB.prepare("SELECT 1 AS ok").first();
    checks.database = { status: "ok", detail: "Histórico acessível", latency_ms: Date.now() - dbStarted };
  } catch (e) {
    checks.database = { status: "error", detail: e?.message === "DB_NOT_BOUND" ? "Banco não conectado" : "Banco sem resposta", latency_ms: Date.now() - dbStarted };
  }

  const elevenKey = readKey(env, "ELEVENLABS_API_KEY");
  const anthropicKey = readKey(env, "ANTHROPIC_API_KEY");
  [checks.elevenlabs, checks.anthropic] = await Promise.all([
    checkExternal({
      url: "https://api.elevenlabs.io/v1/models",
      headers: { "xi-api-key": elevenKey || "" },
      configured: !!elevenKey,
      okDetail: "API de transcrição autenticada",
    }),
    checkExternal({
      url: "https://api.anthropic.com/v1/models?limit=1",
      headers: { "x-api-key": anthropicKey || "", "anthropic-version": "2023-06-01" },
      configured: !!anthropicKey,
      okDetail: "Mentor autenticado",
    }),
  ]);

  const statuses = Object.values(checks).map((item) => item.status);
  return json({
    ok: !statuses.includes("error"),
    checked_at: new Date().toISOString(),
    deploy_commit: readKey(env, "CF_PAGES_COMMIT_SHA") || null,
    checks,
  });
}
