const Produto = require("../../modelos/produto");
const Uso = require("../../modelos/uso");
const confirmarExclusao = require("../../util/confirmar");
const { ErroApi } = require("../../util/erros");
const { texto, numero, idDaRota, CATEGORIAS } = require("../../util/validar");

function ler(c) {
  const categoria = String(c.categoria || "");
  if (!CATEGORIAS.includes(categoria)) throw new ErroApi("Categoria inválida.");
  return {
    nome: texto(c.nome, "Nome", 2, 80),
    categoria,
    preco_extra: numero(c.preco_extra ?? 0, "Preço"),
    ativo: c.ativo !== false,
  };
}

async function listar(req, res) {
  res.json(await Produto.listar());
}

async function criar(req, res) {
  res.status(201).json(await Produto.criar(ler(req.body)));
}

async function atualizar(req, res) {
  const produto = await Produto.atualizar(idDaRota(req.params.id), ler(req.body));
  if (!produto) throw new ErroApi("Produto não encontrado.", 404);
  res.json(produto);
}

async function remover(req, res) {
  const id = idDaRota(req.params.id);
  confirmarExclusao(req, await Uso.avisoProduto(id));
  if (!(await Produto.remover(id))) throw new ErroApi("Produto não encontrado.", 404);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
