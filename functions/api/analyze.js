// =============================================================================
// /api/analyze — Cloudflare Pages Function (cofre/Worker)
// ESCUTA: ElevenLabs Scribe v2 (transcrição + diarização). JUIZ: Anthropic Claude.
// NOVO: usa o CONTEXTO escrito pelo Marcelo p/ (1) identificar qual locutor é ele e
//       (2) julgar com nuance. A própria IA escolhe o locutor; código calcula métricas.
// Segredos: ELEVENLABS_API_KEY, ANTHROPIC_API_KEY, APP_PASSWORD.
// =============================================================================

import { MANUAL } from "./_manual.js";

const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const JUIZ_MODEL = "claude-sonnet-4-6";
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

    // transcrição + diarização (Scribe)
    const stt = await transcrever(file, elevenKey);
    if (stt.erro) return json({ erro: stt.erro }, stt.status || 502);
    const words = stt.words;

    // rótulos amigáveis A/B/C por ordem de aparição
    const sid = (w) => w.speaker_id || "speaker_0";
    const ordem = [];
    for (const w of words) { const s = sid(w); if (!ordem.includes(s)) ordem.push(s); }
    const label = {};
    ordem.forEach((s, i) => { label[s] = String.fromCharCode(65 + i); });

    // agrupa palavras por locutor + métricas por locutor
    const porLabel = {};
    for (const w of words) { const L = label[sid(w)]; (porLabel[L] = porLabel[L] || []).push(w); }
    const labels = Object.keys(porLabel);
    const dominante = labels.slice().sort((a, b) => porLabel[b].length - porLabel[a].length)[0];
    const metricasPorLabel = {};
    for (const L of labels) metricasPorLabel[L] = calcMetricas(porLabel[L]);

    // transcript em turnos (ordem temporal)
    const turnos = construirTurnos(words, (w) => label[sid(w)]);

    // Juiz: identifica o Marcelo (via contexto) e julga
    const veredicto = await chamarJuiz({ turnos, contexto, dominante, metricasPorLabel, rigor, key: anthropicKey });
    let locutor = (veredicto.locutor || "").toUpperCase().replace(/[^A-Z]/g, "") || dominante;
    if (!porLabel[locutor]) locutor = dominante;

    const itens = veredicto.itens || [];
    const acertos = itens.filter((i) => i.tipo === "acerto").length;
    const erros = itens.filter((i) => i.tipo === "erro").length;

    return json({
      placar: { acertos, erros, regras_avaliadas: 13 },
      resumo: veredicto.resumo || "—",
      metricas: metricasPorLabel[locutor] || { ritmo_ppm: 0, pausas: "—", hesitacao: 0 },
      itens,
      reflexoes: veredicto.reflexoes || [],
      voce: { locutor, como: contexto ? "contexto" : "auto" },
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

function calcMetricas(ws) {
  const minhas = ws.slice().sort((a, b) => (a.start || 0) - (b.start || 0));
  let talkSec = 0, pausasLongas = 0, maior = 0;
  for (let i = 0; i < minhas.length; i++) {
    const w = minhas[i];
    if (w.start != null && w.end != null) talkSec += Math.max(0, w.end - w.start);
    if (i > 0) {
      const gap = (minhas[i].start || 0) - (minhas[i - 1].end || 0);
      if (gap > 0 && gap < 2) talkSec += gap;
      if (gap > 1.2) { pausasLongas++; if (gap > maior) maior = gap; }
    }
  }
  const ritmo_ppm = talkSec > 0 ? Math.round(minhas.length / (talkSec / 60)) : 0;
  const txt = " " + minhas.map((w) => w.text).join(" ").toLowerCase() + " ";
  let hesitacao = 0;
  for (const m of MULETAS) { const re = new RegExp("\\b" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g"); hesitacao += (txt.match(re) || []).length; }
  return { ritmo_ppm, pausas: pausasLongas ? `${pausasLongas} (maior ${maior.toFixed(1)}s)` : "nenhuma longa", hesitacao };
}

async function chamarJuiz({ turnos, contexto, dominante, metricasPorLabel, rigor, key }) {
  const rigores = {
    brando: "MODO BRANDO: tom de mentor encorajador. Aponte só os 2-3 erros mais importantes, com leveza, e valorize os acertos. Evite excesso de críticas.",
    medio: "MODO MÉDIO: equilíbrio entre cobrança e encorajamento. Aponte os erros relevantes com objetividade.",
    rigido: "MODO RÍGIDO: implacável. Não deixe passar nenhuma violação, por menor que seja. Cobre padrão de excelência, seja direto e severo (sem ofender), focando no crescimento.",
  };
  const rigorTxt = rigores[rigor] || rigores.medio;
  const metricasTxt = Object.entries(metricasPorLabel).map(([L, m]) => `Locutor ${L}: ${m.ritmo_ppm} ppm, pausas longas ${m.pausas}, ${m.hesitacao} muletas`).join("\n");

  const system = `Você é o JUIZ de comunicação do Marcelo. Avalie a fala dele de forma RÍGIDA e OBJETIVA, ancorado SOMENTE no manual abaixo. Não invente regras fora dele.

NÍVEL DE RIGOR DESTA ANÁLISE: ${rigorTxt}

${MANUAL}

INSTRUÇÕES:
- A CONVERSA vem separada por locutor (Locutor A, B, ...). Use o CONTEXTO informado pelo Marcelo para identificar QUAL locutor é ele. Se o contexto não permitir identificar, use o Locutor ${dominante} (quem mais falou).
- Avalie SOMENTE a fala do Marcelo contra as regras A1–A13. Use o resto da conversa só para entender a situação (ex: ele se defendeu DEPOIS de uma crítica do outro).
- Use o CONTEXTO para dar nuance (negociação, bronca, reunião com chefe etc.), mas o gabarito continua sendo o manual.
- Use o trecho EXATO da fala dele como evidência. Sem trecho, não acuse. Para erros, dê a reescrita melhor (curta).
- Reflexões da Parte B só quando houver gatilho verbal. Reflexão é PERGUNTA, nunca afirmação sobre o corpo.
- Comente ritmo e pausas no resumo (use as métricas do locutor que você identificou como Marcelo). Pausa pode ser estratégica (A6) ou travamento.
- Seja econômico: só itens com evidência real.

Métricas por locutor (já calculadas):
${metricasTxt}

Responda APENAS com JSON válido, sem markdown, neste formato exato:
{
  "locutor": "A",
  "resumo": "2-3 frases diretas (diga em 1 frase como identificou o Marcelo)",
  "itens": [
    { "regra": "A6", "titulo": "nome curto", "tipo": "acerto" ou "erro", "trecho": "trecho exato da fala do Marcelo", "comentario": "por que", "reescrita": "como dizer melhor (só se erro)" }
  ],
  "reflexoes": [ "pergunta de auto-observação" ]
}`;

  const user = `CONTEXTO DO MARCELO: ${contexto || "(não informado)"}

CONVERSA (separada por locutor):
${turnos}`;

  const body = { model: JUIZ_MODEL, max_tokens: 2500, system, messages: [{ role: "user", content: user }] };
  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) { const det = await r.text(); throw new Error("Juiz (Claude) retornou " + r.status + ": " + det.slice(0, 200)); }
  const data = await r.json();
  const texto = (data.content || []).map((c) => c.text || "").join("").trim();
  return extrairJSON(texto);
}

function extrairJSON(texto) {
  try { return JSON.parse(texto); } catch (_) {}
  const ini = texto.indexOf("{"); const fim = texto.lastIndexOf("}");
  if (ini >= 0 && fim > ini) { try { return JSON.parse(texto.slice(ini, fim + 1)); } catch (_) {} }
  return { resumo: "Não consegui interpretar o veredicto.", itens: [], reflexoes: [] };
}

function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) { if (k.trim() === name) return env[k]; }
  return undefined;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}
