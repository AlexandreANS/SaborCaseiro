const Cardapio = require("../modelos/cardapio");
const Bairro = require("../modelos/bairro");
const Loja = require("../modelos/loja");
const Visao = require("../visoes/cardapio");
const { estado } = require("../servicos/funcionamento");
const { cotar } = require("../servicos/precos");
const { localizar } = require("../servicos/cep");
const { ErroApi } = require("../util/erros");

async function cardapio(req, res) {
  const bairros = await Bairro.ativos();
  const menu = await Cardapio.publicadoHoje();
  if (!menu) return res.json(Visao.fechado(bairros, await Cardapio.proximoPublicado()));
  const tipos = await Cardapio.tiposDoMenu([...menu.tipoIds]);
  const categorias = await Cardapio.categorias();
  const vinculos = await Cardapio.vinculos([...menu.produtoIds]);
  const extras = await Cardapio.extrasDoMenu([...menu.produtoIds]);
  res.json(Visao.aberto({ menu, tipos, categorias, vinculos, extras, bairros }));
}

async function funcionamento(req, res) {
  res.json(await estado());
}

async function loja(req, res) {
  res.json({ ...(await Loja.lerLoja()), funcionamento: await estado() });
}

async function bairros(req, res) {
  res.json(await Bairro.ativos());
}

async function cep(req, res) {
  res.json(await localizar(req.params.cep));
}

async function cotacao(req, res) {
  const { itens, tipo_entrega, cep, cupom } = req.body || {};
  if (tipo_entrega && !["entrega", "retirada"].includes(tipo_entrega)) throw new ErroApi("Tipo de entrega inválido.");
  const entrega = (tipo_entrega || "entrega") === "entrega";
  const local = entrega && cep ? await localizar(cep) : null;
  res.json(
    await cotar(itens, { tipo_entrega: tipo_entrega || "entrega", bairro_id: local && local.bairro.id, cupom, clienteId: req.clienteId })
  );
}

module.exports = { cardapio, funcionamento, loja, bairros, cep, cotacao };
