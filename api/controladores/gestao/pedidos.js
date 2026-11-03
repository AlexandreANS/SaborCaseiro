const Pedido = require("../../modelos/pedido");
const Mensagem = require("../../modelos/mensagem");
const Recusa = require("../../modelos/recusa");
const Visao = require("../../visoes/pedido");
const { avisarCliente } = require("../../servicos/eventos");
const { ErroApi } = require("../../util/erros");
const { texto, idDaRota } = require("../../util/validar");

async function carregar(id) {
  const pedido = await Pedido.buscar(idDaRota(id));
  if (!pedido) throw new ErroApi("Pedido não encontrado.", 404);
  return pedido;
}

async function contagem(req, res) {
  res.json(Visao.contagem(await Pedido.contagem()));
}

async function listar(req, res) {
  const status = req.query.status;
  if (status && !Visao.STATUS.includes(status)) throw new ErroApi("Status inválido.");
  const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 50));
  res.json(await Pedido.daGestao(status || null, limite));
}

async function ver(req, res) {
  const pedido = await carregar(req.params.id);
  res.json({ ...pedido, mensagens: await Mensagem.listar(pedido.id) });
}

async function aceitar(req, res) {
  const pedido = await carregar(req.params.id);
  if (pedido.status !== "Esperando") throw new ErroApi("Só é possível aceitar pedidos em espera.", 409);
  await Pedido.aceitar(pedido.id);
  avisarCliente(pedido.id, "pedido");
  res.json(await carregar(pedido.id));
}

async function recusar(req, res) {
  const pedido = await carregar(req.params.id);
  if (pedido.status !== "Esperando") throw new ErroApi("Só é possível recusar pedidos em espera.", 409);
  let motivo = req.body.motivo;
  if (req.body.mensagem_id) {
    motivo = await Recusa.texto(idDaRota(req.body.mensagem_id));
    if (!motivo) throw new ErroApi("Mensagem de recusa não encontrada.", 404);
  }
  await Pedido.recusar(pedido.id, texto(motivo, "Motivo da recusa", 3, 300));
  avisarCliente(pedido.id, "pedido");
  res.json(await carregar(pedido.id));
}

async function mudarStatus(req, res) {
  const pedido = await carregar(req.params.id);
  const novo = req.body.status;
  if (!Visao.STATUS.includes(novo)) throw new ErroApi("Status inválido.");
  if (pedido.status === "Esperando") throw new ErroApi("Aceite ou recuse o pedido antes de mudar o status.", 409);
  if (pedido.status === "Concluído" || pedido.status === "Cancelado") throw new ErroApi("Este pedido já foi encerrado.", 409);
  if (novo === "Esperando" || novo === "Cancelado" || !Visao.PASSOS[pedido.tipo_entrega].includes(novo)) {
    throw new ErroApi("Mudança de status não permitida para este pedido.", 409);
  }
  if (novo === pedido.status) throw new ErroApi("O pedido já está nesse status.", 409);
  await Pedido.mudarStatus(pedido.id, novo, pedido.status);
  avisarCliente(pedido.id, "pedido");
  res.json(await carregar(pedido.id));
}

async function mensagens(req, res) {
  const pedido = await carregar(req.params.id);
  res.json(await Mensagem.listar(pedido.id));
}

async function enviarMensagem(req, res) {
  const pedido = await carregar(req.params.id);
  await Mensagem.criar(pedido.id, "equipe", texto(req.body.texto, "Mensagem", 1, 500));
  avisarCliente(pedido.id, "mensagem");
  res.status(201).json(await Mensagem.listar(pedido.id));
}

module.exports = { contagem, listar, ver, aceitar, recusar, mudarStatus, mensagens, enviarMensagem };
