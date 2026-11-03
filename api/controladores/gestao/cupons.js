const Cupom = require("../../modelos/cupom");
const { ErroApi } = require("../../util/erros");
const { texto, numero, dia } = require("../../util/validar");

function ler(c) {
  const percentual = numero(c.percentual, "Percentual");
  if (percentual <= 0 || percentual > 100) throw new ErroApi("Percentual inválido.");
  return {
    percentual,
    primeiro: c.apenas_primeiro_pedido === true,
    minimo: numero(c.valor_minimo ?? 0, "Valor mínimo"),
    ate: c.valido_ate ? dia(c.valido_ate, "Validade") : null,
    ativo: c.ativo !== false,
  };
}

function codigo(valor) {
  const c = texto(valor, "Código", 3, 30).toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(c)) throw new ErroApi("Código inválido: use letras, números, - ou _.");
  return c;
}

async function listar(req, res) {
  res.json(await Cupom.listar());
}

async function criar(req, res) {
  const d = ler(req.body);
  res.status(201).json(await Cupom.criar(codigo(req.body.codigo), d));
}

async function atualizar(req, res) {
  const cupom = await Cupom.atualizar(codigo(req.params.codigo), ler(req.body));
  if (!cupom) throw new ErroApi("Cupom não encontrado.", 404);
  res.json(cupom);
}

async function remover(req, res) {
  if (!(await Cupom.remover(codigo(req.params.codigo)))) throw new ErroApi("Cupom não encontrado.", 404);
  res.status(204).end();
}

module.exports = { listar, criar, atualizar, remover };
