const Cardapio = require("../../modelos/cardapio");
const { ErroApi } = require("../../util/erros");
const { dia, inteiro } = require("../../util/validar");

function ids(lista, nome) {
  if (!Array.isArray(lista)) throw new ErroApi(`${nome} inválidos.`);
  return [...new Set(lista.map((i) => inteiro(i, nome, 1)))];
}

async function hoje(req, res) {
  res.json(await Cardapio.dia(await Cardapio.hoje()));
}

async function ver(req, res) {
  res.json(await Cardapio.dia(dia(req.params.data)));
}

async function gravar(req, res) {
  const data = dia(req.params.data);
  await Cardapio.gravarDia(data, ids(req.body.tipo_ids, "Tipos"), ids(req.body.produto_ids, "Produtos"));
  res.json(await Cardapio.dia(data));
}

async function copiar(req, res) {
  const data = dia(req.params.data);
  const atual = await Cardapio.dia(data);
  if (atual.publicado) throw new ErroApi("Despublique este cardápio antes de copiar outro por cima.", 409);
  const origem = await Cardapio.copiarUltimo(data);
  if (!origem) throw new ErroApi("Ainda não há cardápio anterior para copiar.", 404);
  res.json({ ...(await Cardapio.dia(data)), copiado_de: origem });
}

async function publicar(req, res) {
  const data = dia(req.params.data);
  const valor = req.body.publicado !== false;
  const atual = await Cardapio.dia(data);
  if (valor && (!atual.tipo_ids.length || !atual.produto_ids.length)) {
    throw new ErroApi("Selecione ao menos um tipo e um produto antes de publicar.");
  }
  await Cardapio.publicar(data, valor);
  res.json(await Cardapio.dia(data));
}

module.exports = { hoje, ver, gravar, copiar, publicar };
