// =============================================================================
// /api/analyze  —  Cloudflare Pages Function (o "cofre/Worker" do PRD)
//
// FLUXO (Passos 2 + 3):
//   1. Recebe o áudio gravado no app (multipart form, campo "audio").
//   2. Sobe o áudio no AssemblyAI -> pede transcrição com diarização (vozes) + pt.
//   3. Faz polling até a transcrição ficar pronta.
//   4. Calcula métricas OBJETIVAS da fala do Marcelo (ritmo, pausas, muletas) — cálculo, não IA.
//   5. Manda a fala do Marcelo + o manual pro Juiz (Claude) -> recebe acertos/erros/reflexões.
//   6. Monta o JSON do CONTRATO e devolve pro frontend.
//
// SEGREDOS (Cloudflare Pages > Settings > Environment variables):
//   - ASSEMBLYAI_API_KEY
//   - ANTHROPIC_API_KEY
// =============================================================================

import { MANUAL } from "./_manual.js";

const AAI = "https://api.assemblyai.com/v2";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const JUIZ_MODEL = "claude-sonnet-4-6";   // troque p/ "claude-opus-4-8" se quiser julgamento mais afiado

const MULETAS = ["né", "tipo", "então", "aí", "sabe", "entendeu", "cara"];

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const assemblyKey = readKey(env, "ASSEMBLYAI_API_KEY");
    const anthropicKey = readKey(env, "ANTHROPIC_API_KEY");
    if (!assemblyKey || !anthropicKey) {
      return json({ erro: "Chaves de API não configuradas no servidor." }, 500);
    }

    const form = await request.formData();
    const file = form.get("audio");
    if (!file) return json({ erro: "Nenhum áudio recebido." }, 400);
    const audioBytes = await file.arrayBuffer();

    const upRes = await fetch(`${AAI}/upload`, {
      method: "POST",
      headers: { authorization: assemblyKey },
      body: audioBytes,
    });
    if (!upRes.ok) return json({ erro: "Falha no upload do áudio (AssemblyAI)." }, 502);
    const { upload_url } = await upRes.json();

    const trRes = await fetch(`${AAI}/transcript`, {
      method: "POST",
      headers: { authorization: assemblyKey, "content-type": "application/json" },
      body: JSON.stringify({
        audio_url: upload_url,
        speaker_labels: true,
        language_code: "pt",
        punctuate: true,
        format_text: true,
      }),
    });
    if (!trRes.ok) return json({ erro: "Falha ao criar transcrição (AssemblyAI)." }, 502);
    const criada = await trRes.json();

    const transcript = await aguardarTranscricao(criada.id, assemblyKey);
    if (transcript.status === "error") {
      return json({ erro: "Erro na transcrição: " + (transcript.error || "desconhecido") }, 502);
    }

    const utterances = transcript.utterances || [];
    if (!utterances.length) {
      return json({ erro: "Não consegui separar falas. Áudio muito curto ou sem voz clara?" }, 422);
    }

    const { falanteMarcelo, falaMarcelo, metricas } = analisarFalante(utterances);
    const veredicto = await chamarJuiz(falaMarcelo, metricas, anthropicKey);

    const itens = veredicto.itens || [];
    const acertos = itens.filter((i) => i.tipo === "acerto").length;
    const erros = itens.filter((i) => i.tipo === "erro").length;

    return json({
      placar: { acertos, erros, regras_avaliadas: 13 },
      resumo: veredicto.resumo || "—",
      metricas,
      itens,
      reflexoes: veredicto.reflexoes || [],
      _debug: { falante_marcelo: falanteMarcelo, total_falantes: contarFalantes(utterances) },
    });
  } catch (e) {
    return json({ erro: "Falha inesperada: " + e.message }, 500);
  }
}

async function aguardarTranscricao(id, key) {
  const MAX = 40;
  const ESPERA = 3000;
  for (let i = 0; i < MAX; i++) {
    const r = await fetch(`${AAI}/transcript/${id}`, { headers: { authorization: key } });
    const data = await r.json();
    if (data.status === "completed" || data.status === "error") return data;
    await sleep(ESPERA);
  }
  return { status: "error", error: "tempo esgotado no polling" };
}

function analisarFalante(utterances) {
  const porFalante = {};
  for (const u of utterances) {
    const n = (u.text || "").trim().split(/\s+/).filter(Boolean).length;
    porFalante[u.speaker] = (porFalante[u.speaker] || 0) + n;
  }
  const falanteMarcelo = Object.entries(porFalante).sort((a, b) => b[1] - a[1])[0][0];

  const minhas = utterances.filter((u) => u.speaker === falanteMarcelo);
  const falaMarcelo = minhas.map((u) => u.text).join(" ").trim();

  let msFalando = 0;
  let palavras = 0;
  const todasPalavras = [];
  for (const u of minhas) {
    msFalando += (u.end - u.start);
    palavras += (u.text || "").trim().split(/\s+/).filter(Boolean).length;
    if (u.words) todasPalavras.push(...u.words);
  }
  const minutos = msFalando / 60000;
  const ritmo_ppm = minutos > 0 ? Math.round(palavras / minutos) : 0;

  let pausasLongas = 0;
  for (let i = 1; i < todasPalavras.length; i++) {
    const gap = todasPalavras[i].start - todasPalavras[i - 1].end;
    if (gap > 1500) pausasLongas++;
  }

  const txt = " " + falaMarcelo.toLowerCase() + " ";
  let hesitacao = 0;
  for (const m of MULETAS) {
    const re = new RegExp("\\b" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "g");
    hesitacao += (txt.match(re) || []).length;
  }

  return {
    falanteMarcelo,
    falaMarcelo,
    metricas: {
      ritmo_ppm,
      pausas: pausasLongas + (pausasLongas === 1 ? " pausa longa" : " pausas longas"),
      hesitacao,
    },
  };
}

function contarFalantes(utterances) {
  return new Set(utterances.map((u) => u.speaker)).size;
}

async function chamarJuiz(falaMarcelo, metricas, key) {
  const system = `Você é o JUIZ de comunicação do Marcelo. Avalie a fala dele de forma RÍGIDA e OBJETIVA, ancorado SOMENTE no manual abaixo. Não invente regras fora dele.

${MANUAL}

INSTRUÇÕES DE SAÍDA:
- Avalie a fala do Marcelo contra as regras A1–A13 (Parte A). Para cada regra relevante que ele CUMPRIU ou QUEBROU, gere um item.
- Use o trecho EXATO da fala como evidência. Sem trecho, não acuse.
- Para erros, dê a reescrita melhor (curta, no estilo das regras).
- Gere reflexões da Parte B SÓ quando houver gatilho verbal no texto. Reflexão é PERGUNTA, nunca afirmação sobre o corpo.
- Seja econômico: só itens com evidência real. Não force 13 itens.
- Métricas já calculadas (use só pra contextualizar, não recalcule): ritmo ${metricas.ritmo_ppm} ppm, ${metricas.pausas}, ${metricas.hesitacao} muletas.

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
    messages: [
      { role: "user", content: `Fala do Marcelo (transcrita):\n\n"""${falaMarcelo}"""` },
    ],
  };

  const r = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
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
  if (ini >= 0 && fim > ini) {
    try { return JSON.parse(texto.slice(ini, fim + 1)); } catch (_) {}
  }
  return { resumo: "Não consegui interpretar o veredicto.", itens: [], reflexoes: [] };
}

// Lê uma env var tolerando espaços acidentais no nome (ex: "ANTHROPIC_API_KEY ").
function readKey(env, name) {
  if (env[name]) return env[name];
  for (const k of Object.keys(env || {})) {
    if (k.trim() === name) return env[k];
  }
  return undefined;
}

function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
