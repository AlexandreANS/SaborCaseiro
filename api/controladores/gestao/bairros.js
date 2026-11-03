const Bairro = require("../../modelos/bairro");
const Uso = require("../../modelos/uso");
const confirmarExclusao = require("../../util/confirmar");
const { ErroApi } = require("../../util/erros");
const { texto, numero, idDaRota } = require("../../util/validar");

const ler = (c) => ({ nome: texto(c.nome, "Nome", 2, 80), taxa: numero(c.taxa_entrega, "Taxa"), ativo: c.ativo !== false });

async function listar(req, res) {
  res.json(await Bairro.todos());
}

async function criar(req, res) {
  res.status(201).json(await Bairro.criar(ler(req.body)));
}

async function atualizar(req, res) {
  const bairro = await Bairro.atualizar(idDaRota(req.params.id), ler(req.body));
  if (!bairro) throw new ErroApi("Bairro não encontrado.", 404);
  res.json(bairro);
}

async function remover(req, res) {
  const id = idDaRota(req.params.id);
  confirmarExclusao(req, await Uso.avisoBairro(id));
  if (!(await Bairro.remover(id))) throw new ErroApi("Bairro não encontrado.", 404);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
