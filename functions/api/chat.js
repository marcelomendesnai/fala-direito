// /api/chat — conversa com o Mentor sobre o laudo já entregue.
// v0.46: o Mentor REVISA o laudo contra a transcrição quando contestado (antes era
// instruído a "defender" a análise e só relia depois de o Marcelo insistir).
import { MANUAL } from "./_manual.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

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
    const key = readKey(env, "ANTHROPIC_API_KEY");
    if (!key) return json({ erro: "Chave da Anthropic não configurada." }, 500);
    const appPass = readKey(env, "APP_PASSWORD");
    if (appPass && (request.headers.get("x-app-pass") || "") !== appPass) return json({ erro: "Senha incorreta." }, 401);

    const body = await request.json();
    const contexto = (body.contexto || "").toString();
    const laudo = (body.laudo || "").toString();
    const turnos = (body.turnos || "").toString();
    const mensagens = Array.isArray(body.mensagens) ? body.mensagens : [];
    const memoria = (body.memoria || "").toString();

    const system = `Você é o MENTOR de comunicação do Marcelo. Você acabou de entregar um laudo da fala dele e agora CONVERSA com ele pra fazê-lo aprender e corrigir de verdade.

${MANUAL}

CONTEXTO DA CONVERSA ANALISADA (situação descrita pelo Marcelo antes da análise): ${contexto || "(não informado)"}

MEMÓRIA DO MARCELO (sessões e padrões anteriores): ${memoria || "(primeira sessão)"}
Você acompanha a evolução dele ao longo do tempo: quando ajudar, conecte o ponto atual com a MESMA regra em sessões anteriores, sem diagnóstico psicológico.

SEU LAUDO (já entregue):
${laudo || "(sem laudo)"}

TRANSCRIÇÃO (referência):
${turnos || "(sem transcrição)"}

COMO RESPONDER:
- Quando o Marcelo perguntar ou contestar um ponto, RELEIA primeiro o trecho na transcrição e confira contra o manual: situação (contexto que ele informou), função do trecho, "NÃO é erro quando" e teste de impacto. Só depois responda.
- Se a análise se sustenta, explique por quê com o trecho literal e a regra. Se não se sustenta, diga com clareza "esse ponto do laudo está errado" e corrija. Não use meio-termo ("concordo parcialmente") para evitar admitir erro: separe o que está certo do que está errado.
- Diferencie o trecho em discussão do resto da fala. Ex.: storytelling que leva ao ponto é permitido; justificativa de bastidor antes do ponto não é.
- Foco em fazê-lo APRENDER e treinar a correção (dê o "como fazer diferente"). Direto: no máximo 5 frases curtas, sem clichê, sem bajular.
- Equilíbrio: valorize o que ele já faz bem e a evolução, não só o erro. Crescimento, não punição.
- Pode fazer 1 pergunta socrática quando ajudar a ficha cair.`;

    const msgs = mensagens
      .filter((m) => m && m.content && m.content !== "…")
      .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content) }));
    if (!msgs.length || msgs[0].role !== "user") msgs.unshift({ role: "user", content: "Me explica o laudo." });

    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, system, messages: msgs }),
    });
    if (!r.ok) { const det = await r.text(); return json({ erro: "Mentor retornou " + r.status + ": " + det.slice(0, 150) }, 502); }
    const data = await r.json();
    const reply = (data.content || []).map((c) => c.text || "").join("").trim();
    return json({ reply: reply || "(sem resposta)" });
  } catch (e) {
    return json({ erro: "Falha: " + e.message }, 500);
  }
}
