// =============================================================================
// /api/analyze  —  Cloudflare Pages Function (cofre/Worker)
//
// ESCUTA: ElevenLabs Scribe v2 (síncrono, com diarização + timestamps em segundos).
//   Substituiu o AssemblyAI (precisão melhor em português). 1 request só, sem polling.
// JUIZ: Claude aplica o MANUAL_REGRAS_v2.md sobre a fala do Marcelo.
//
// SEGREDOS (Cloudflare Pages > Variables and Secrets, Production):
//   - ELEVENLABS_API_KEY
//   - ANTHROPIC_API_KEY
//   - APP_PASSWORD (trava de acesso)
//   (readKey tolera espaço acidental no fim do nome.)
// =============================================================================

import { MANUAL } from "./_manual.js";

const STT_URL = "https://api.elevenlabs.io/v1/speech-to-text";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const JUIZ_MODEL = "claude-sonnet-4-6";   // troque p/ "claude-opus-4-8" se quiser julgamento mais afiado
const STT_MODEL = "scribe_v2";

const MULETAS = ["né", "tipo", "então", "aí", "sabe", "entendeu", "cara"];

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const elevenKey = readKey(env, "ELEVENLABS_API_KEY");
    const anthropicKey = readKey(env, "ANTHROPIC_API_KEY");
    if (!elevenKey || !anthropicKey) {
      return json({ erro: "Chaves de API não configuradas (ELEVENLABS_API_KEY / ANTHROPIC_API_KEY)." }, 500);
    }

    // trava de acesso
    const appPass = readKey(env, "APP_PASSWORD");
    if (appPass) {
      const sent = request.headers.get("x-app-pass") || "";
      if (sent !== appPass) return json({ erro: "Senha incorreta." }, 401);
    }

    const form = await request.formData();
    const file = form.get("audio");
    if (!file) return json({ erro: "Nenhum áudio recebido." }, 400);
    const rigor = (form.get("rigor") || "medio").toString();
    const marker = (form.get("marker") || "ok").toString();

    // transcrição (ElevenLabs Scribe) — síncrona, com diarização
    const sttForm = new FormData();
    sttForm.append("file", file, "audio.webm");
    sttForm.append("model_id", STT_MODEL);
    sttForm.append("language_code", "pt");
    sttForm.append("diarize", "true");
    sttForm.append("timestamps_granularity", "word");

    const sttRes = await fetch(STT_URL, { method: "POST", headers: { "xi-api-key": elevenKey }, body: sttForm });
    if (!sttRes.ok) {
      const det = await sttRes.text();
      return json({ erro: "Falha na transcrição (ElevenLabs " + sttRes.status + "): " + det.slice(0, 150) }, 502);
    }
    const stt = await sttRes.json();

    const words = (stt.words || []).filter((w) => w.type === "word" && w.text && w.text.trim());
    if (!words.length) return json({ erro: "Não consegui transcrever. Áudio muito curto ou sem voz clara?" }, 422);

    const { falanteMarcelo, falaMarcelo, metricas, comoIdentificou } = analisarFalante(words, marker);
    if (!falaMarcelo) return json({ erro: "Não identifiquei sua fala no áudio." }, 422);

    const veredicto = await chamarJuiz(falaMarcelo, metricas, anthropicKey, rigor);
    const itens = veredicto.itens || [];
    const acertos = itens.filter((i) => i.tipo === "acerto").length;
    const erros = itens.filter((i) => i.tipo === "erro").length;

    return json({
      placar: { acertos, erros, regras_avaliadas: 13 },
      resumo: veredicto.resumo || "—",
      metricas,
      itens,
      reflexoes: veredicto.reflexoes || [],
      voce: { locutor: falanteMarcelo, como: comoIdentificou },
    });
  } catch (e) {
    return json({ erro: "Falha inesperada: " + e.message }, 500);
  }
}

// ---------------------------------------------------------------------------
// Identifica o Marcelo (por marcador falado, ex: "ok"; senão quem mais falou)
// e calcula métricas. Tempos do Scribe vêm em SEGUNDOS.
// ---------------------------------------------------------------------------
function analisarFalante(words, marker) {
  const sid = (w) => w.speaker_id || "speaker_0";

  // mapa de rótulos amigáveis: speaker_0 -> A, na ordem de aparição
  const ordem = [];
  for (const w of words) { const s = sid(w); if (!ordem.includes(s)) ordem.push(s); }
  const label = {};
  ordem.forEach((s, i) => { label[s] = String.fromCharCode(65 + i); });

  // dominante (fallback)
  const cont = {};
  for (const w of words) cont[sid(w)] = (cont[sid(w)] || 0) + 1;
  const dominante = Object.entries(cont).sort((a, b) => b[1] - a[1])[0][0];

  // marcador: 1a palavra que casa com o marker (ex: "ok")
  let falante = null, comoIdentificou = "dominante";
  const escapa = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const reExata = marker ? new RegExp("^" + escapa(marker) + "[.,!?]?$", "i") : null;
  if (reExata) {
    for (const w of words) {
      if (reExata.test((w.text || "").trim())) { falante = sid(w); comoIdentificou = "marcador"; break; }
    }
  }
  if (!falante) falante = dominante;

  const minhas = words.filter((w) => sid(w) === falante).sort((a, b) => (a.start || 0) - (b.start || 0));
  let falaMarcelo = minhas.map((w) => w.text).join(" ").replace(/\s+([.,!?;:])/g, "$1").trim();
  // remove a 1a ocorrência do marcador (a calibração) pra não sujar a análise
  if (marker) falaMarcelo = falaMarcelo.replace(new RegExp("^\\s*" + escapa(marker) + "[.,!?]?\\s*", "i"), "").trim();

  // ritmo + pausas (segundos)
  let talkSec = 0, pausasLongas = 0, maiorPausa = 0;
  for (let i = 0; i < minhas.length; i++) {
    const w = minhas[i];
    if (w.start != null && w.end != null) talkSec += Math.max(0, w.end - w.start);
    if (i > 0) {
      const gap = (minhas[i].start || 0) - (minhas[i - 1].end || 0);
      if (gap > 0 && gap < 2) talkSec += gap;            // micro-pausas = fala contínua
      if (gap > 1.2) { pausasLongas++; if (gap > maiorPausa) maiorPausa = gap; }
    }
  }
  const ritmo_ppm = talkSec > 0 ? Math.round(minhas.length / (talkSec / 60)) : 0;

  // muletas (A12)
  const txt = " " + falaMarcelo.toLowerCase() + " ";
  let hesitacao = 0;
  for (const m of MULETAS) {
    const re = new RegExp("\\b" + escapa(m) + "\\b", "g");
    hesitacao += (txt.match(re) || []).length;
  }

  return {
    falanteMarcelo: label[falante] || "A",
    falaMarcelo,
    comoIdentificou,
    metricas: {
      ritmo_ppm,
      pausas: pausasLongas ? `${pausasLongas} (maior ${maiorPausa.toFixed(1)}s)` : "nenhuma longa",
      hesitacao,
    },
  };
}

async function chamarJuiz(falaMarcelo, metricas, key, rigor) {
  const rigores = {
    brando: "MODO BRANDO: tom de mentor encorajador. Aponte só os 2-3 erros mais importantes, com leveza, e valorize os acertos. Evite excesso de críticas.",
    medio: "MODO MÉDIO: equilíbrio entre cobrança e encorajamento. Aponte os erros relevantes com objetividade.",
    rigido: "MODO RÍGIDO: implacável. Não deixe passar nenhuma violação, por menor que seja. Cobre padrão de excelência, seja direto e severo (sem ofender), focando no crescimento.",
  };
  const rigorTxt = rigores[rigor] || rigores.medio;
  const system = `Você é o JUIZ de comunicação do Marcelo. Avalie a fala dele de forma RÍGIDA e OBJETIVA, ancorado SOMENTE no manual abaixo. Não invente regras fora dele.

NÍVEL DE RIGOR DESTA ANÁLISE: ${rigorTxt}

${MANUAL}

INSTRUÇÕES DE SAÍDA:
- Avalie a fala do Marcelo contra as regras A1–A13 (Parte A). Para cada regra relevante que ele CUMPRIU ou QUEBROU, gere um item.
- Use o trecho EXATO da fala como evidência. Sem trecho, não acuse.
- Para erros, dê a reescrita melhor (curta, no estilo das regras).
- Gere reflexões da Parte B SÓ quando houver gatilho verbal no texto. Reflexão é PERGUNTA, nunca afirmação sobre o corpo.
- Seja econômico: só itens com evidência real. Não force 13 itens.
- Métricas já calculadas (use só pra contextualizar, não recalcule): ritmo ${metricas.ritmo_ppm} ppm, pausas longas ${metricas.pausas}, ${metricas.hesitacao} muletas.
- RITMO E PAUSAS: comente sempre o ritmo e as pausas no resumo. Uma pausa pode ser ESTRATÉGICA (boa — segurar o silêncio, A6) ou TRAVAMENTO/insegurança (ruim — ligado à Parte B). Se for relevante, gere um item sob A6/A7 e/ou uma reflexão sobre isso.

Responda APENAS com JSON válido, sem markdown, neste formato exato:
{
  "resumo": "2-3 frases diretas sobre o desempenho geral",
  "itens": [
    { "regra": "A6", "titulo": "nome curto da regra", "tipo": "acerto" ou "erro", "trecho": "trecho exato da fala", "comentario": "por que (1-2 frases)", "reescrita": "como dizer melhor (só se erro)" }
  ],
  "reflexoes": [ "pergunta de auto-observação" ]
}`;

  const body = {
    model: JUIZ_MODEL,
    max_tokens: 2500,
    system,
    messages: [{ role: "user", content: `Fala do Marcelo (transcrita):\n\n"""${falaMarcelo}"""` }],
  };

  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const det = await r.text();
    throw new Error("Juiz (Claude) retornou " + r.status + ": " + det.slice(0, 200));
  }
  const data = await r.json();
  const texto = (data.content || []).map((c) => c.text || "").join("").trim();
  return extrairJSON(texto);
}

function extrairJSON(texto) {
  try { return JSON.parse(texto); } catch (_) {}
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
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
