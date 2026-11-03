const Recusa = require("../../modelos/recusa");
const { ErroApi } = require("../../util/erros");
const { texto, idDaRota } = require("../../util/validar");

const ler = (corpo) => texto(corpo.texto, "Mensagem", 3, 300);

async function listar(req, res) {
  res.json(await Recusa.listar());
}

async function criar(req, res) {
  res.status(201).json(await Recusa.criar(ler(req.body)));
}

async function atualizar(req, res) {
  const recusa = await Recusa.atualizar(idDaRota(req.params.id), ler(req.body));
  if (!recusa) throw new ErroApi("Mensagem não encontrada.", 404);
  res.json(recusa);
}

async function remover(req, res) {
  if (!(await Recusa.remover(idDaRota(req.params.id)))) throw new ErroApi("Mensagem não encontrada.", 404);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
