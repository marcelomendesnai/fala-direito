// /api/regras — entrega os textos das regras (fonte única: _regras.js) para a
// tela do app. Sem senha: o conteúdo é o manual, não dado pessoal.
import { regrasParaTela } from "./_regras.js";

export async function onRequestGet() {
  return new Response(JSON.stringify(regrasParaTela()), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
