const Tipo = require("../../modelos/tipo");
const Uso = require("../../modelos/uso");
const confirmarExclusao = require("../../util/confirmar");
const { ErroApi } = require("../../util/erros");
const { texto, numero, inteiro, idDaRota, CATEGORIAS } = require("../../util/validar");

function ler(corpo) {
  const categorias = Array.isArray(corpo.categorias) ? corpo.categorias : [];
  const vistas = new Set();
  const lista = categorias.map((c) => {
    const categoria = String(c.categoria || "");
    if (!CATEGORIAS.includes(categoria) || categoria === "extra" || vistas.has(categoria)) throw new ErroApi("Categorias inválidas.");
    vistas.add(categoria);
    const minimo = inteiro(c.minimo ?? 0, "Mínimo");
    const maximo = inteiro(c.maximo ?? 1, "Máximo");
    if (maximo < minimo) throw new ErroApi("O máximo não pode ser menor que o mínimo.");
    return { categoria, minimo, maximo };
  });
  const ids = Array.isArray(corpo.produto_ids) ? corpo.produto_ids.map((i) => inteiro(i, "Produto", 1)) : [];
  return {
    nome: texto(corpo.nome, "Nome", 2, 80),
    descricao: String(corpo.descricao || "")
      .trim()
      .slice(0, 300),
    preco: numero(corpo.preco, "Preço"),
    ativo: corpo.ativo !== false,
    categorias: lista,
    produto_ids: [...new Set(ids)],
  };
}

async function listar(req, res) {
  res.json(await Tipo.listar());
}

async function criar(req, res) {
  res.status(201).json(await Tipo.gravar(null, ler(req.body)));
}

async function atualizar(req, res) {
  res.json(await Tipo.gravar(idDaRota(req.params.id), ler(req.body)));
}

async function remover(req, res) {
  const id = idDaRota(req.params.id);
  confirmarExclusao(req, await Uso.avisoTipo(id));
  if (!(await Tipo.remover(id))) throw new ErroApi("Tipo não encontrado.", 404);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
