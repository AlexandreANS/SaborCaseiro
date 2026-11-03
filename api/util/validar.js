const { ErroApi } = require("./erros");

function texto(valor, nome, min = 1, max = 200) {
  const t = String(valor ?? "").trim();
  if (t.length < min || t.length > max) throw new ErroApi(`${nome} inválido.`);
  return t;
}

function numero(valor, nome, min = 0) {
  const n = Number(String(valor ?? "").replace(",", "."));
  if (!Number.isFinite(n) || n < min) throw new ErroApi(`${nome} inválido.`);
  return n;
}

function inteiro(valor, nome, min = 0) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min) throw new ErroApi(`${nome} inválido.`);
  return n;
}

function idDaRota(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new ErroApi("Registro não encontrado.", 404);
  return n;
}

function dia(valor, nome = "Data") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor || ""))) throw new ErroApi(`${nome} inválida.`);
  return valor;
}

const CATEGORIAS = ["carboidrato", "proteina", "acompanhamento", "salada", "extra"];

module.exports = { texto, numero, inteiro, idDaRota, dia, CATEGORIAS };
