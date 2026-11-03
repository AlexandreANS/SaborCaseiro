const Pedido = require("../modelos/pedido");
const Mensagem = require("../modelos/mensagem");
const Cliente = require("../modelos/cliente");
const transacao = require("../modelos/transacao");
const { cotar } = require("../servicos/precos");
const { localizar } = require("../servicos/cep");
const { validarHorario } = require("../servicos/funcionamento");
const { assinar, avisarGerente, emitir } = require("../servicos/eventos");
const { ErroApi } = require("../util/erros");

function idPedido(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ErroApi("Pedido não encontrado.", 404);
  return id;
}

async function doCliente(req) {
  const pedido = await Pedido.buscar(idPedido(req), req.clienteId);
  if (!pedido) throw new ErroApi("Pedido não encontrado.", 404);
  return pedido;
}

async function lerPedido(d) {
  const nome = String(d.nome || "").trim();
  const telefone = String(d.telefone || "").trim();
  if (nome.length < 2) throw new ErroApi("Informe o nome para o pedido.");
  if (telefone.replace(/\D/g, "").length < 10) throw new ErroApi("Telefone inválido (inclua o DDD).");
  if (!["entrega", "retirada"].includes(d.tipo_entrega)) throw new ErroApi("Escolha entrega ou retirada.");
  const entrega = d.tipo_entrega === "entrega";
  const aceitos = entrega ? ["pix", "cartao"] : ["pix", "cartao", "dinheiro"];
  if (!aceitos.includes(d.forma_pagamento)) {
    throw new ErroApi(entrega ? "Na entrega o pagamento é apenas Pix ou cartão." : "Escolha a forma de pagamento.");
  }
  let endereco = d.endereco || {};
  let bairroId;
  if (entrega) {
    if (!endereco.cep) throw new ErroApi("Informe o CEP da entrega.");
    if (!endereco.rua || !endereco.numero) throw new ErroApi("Informe rua e número para a entrega.");
    const local = await localizar(endereco.cep);
    endereco = { ...endereco, cep: local.cep };
    bairroId = local.bairro.id;
  }
  let horario = null;
  if (d.horario && d.horario !== "asap") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.horario)) throw new ErroApi("Horário inválido.");
    horario = d.horario;
  }
  await validarHorario(horario);
  let troco = null;
  if (d.forma_pagamento === "dinheiro" && d.troco_para) {
    troco = Number(d.troco_para);
    if (!(troco > 0)) throw new ErroApi("Valor de troco inválido.");
  }
  return {
    nome,
    telefone,
    entrega,
    endereco,
    bairroId,
    horario,
    troco,
    tipo_entrega: d.tipo_entrega,
    forma_pagamento: d.forma_pagamento,
    observacoes: d.observacoes ? String(d.observacoes).slice(0, 500) : null,
  };
}

function gravar(d, pedido, clienteId) {
  return transacao(async (con) => {
    await con.query("SELECT pg_advisory_xact_lock($1)", [clienteId]);
    const cot = await cotar(d.itens, { tipo_entrega: d.tipo_entrega, bairro_id: pedido.bairroId, cupom: d.cupom, clienteId }, con);
    if (d.cupom && !cot.cupom) throw new ErroApi(cot.cupom_mensagem || "Cupom inválido.");
    if (pedido.troco !== null && pedido.troco < cot.total)
      throw new ErroApi("O valor do troco deve ser maior ou igual ao total do pedido.");
    const novo = await Pedido.criar(con, pedido, cot, clienteId);
    if (pedido.salvar && pedido.entrega) await Cliente.salvarEndereco(con, clienteId, pedido.endereco, cot.bairro.id);
    return novo;
  });
}

const chaveValida = (c) => (/^[\w-]{8,64}$/.test(String(c || "")) ? String(c) : null);

async function criar(req, res) {
  const d = req.body || {};
  const chave = chaveValida(d.chave_envio);
  if (chave) {
    const existente = await Pedido.idPorChave(req.clienteId, chave);
    if (existente) return res.status(200).json(await Pedido.buscar(existente, req.clienteId));
  }
  const pedido = { ...(await lerPedido(d)), chave, salvar: !!d.salvar_endereco };
  let id;
  let repetido = false;
  try {
    id = await gravar(d, pedido, req.clienteId);
  } catch (erro) {
    id = erro.code === "23505" && chave ? await Pedido.idPorChave(req.clienteId, chave) : null;
    if (!id) throw erro;
    repetido = true;
  }
  if (repetido) return res.status(200).json(await Pedido.buscar(id, req.clienteId));
  avisarGerente("novo", id);
  emitir("cliente:" + req.clienteId, { tipo: "novo", id });
  res.status(201).json(await Pedido.buscar(id, req.clienteId));
}

function eventos(req, res) {
  assinar("cliente:" + req.clienteId, req, res);
}

async function listar(req, res) {
  const limite = Math.min(200, Math.max(1, Number(req.query.limite) || 20));
  res.json(await Pedido.doCliente(req.clienteId, limite));
}

async function ver(req, res) {
  res.json(await doCliente(req));
}

async function cancelar(req, res) {
  const pedido = await doCliente(req);
  await Pedido.cancelarPeloCliente(pedido.id, req.clienteId);
  avisarGerente("pedido", pedido.id);
  res.json(await doCliente(req));
}

async function repetir(req, res) {
  const pedido = await doCliente(req);
  const itens = [];
  const indisponiveis = [];
  for (const r of await Pedido.paraRepetir(pedido.id)) {
    const item = r.extra
      ? { extra_id: r.produto_id, quantidade: r.quantidade }
      : {
          tipo_id: r.tipo_id,
          ingredientes: r.ingredientes.filter((x) => x),
          adicionais: r.adicionais.filter((x) => x),
          quantidade: r.quantidade,
          observacoes: r.observacoes || "",
        };
    try {
      if (r.orfaos || (r.extra ? !r.produto_id : !r.tipo_id)) throw new ErroApi("indisponível");
      await cotar([item], { tipo_entrega: "retirada" });
      itens.push(item);
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      indisponiveis.push(r.tipo_nome);
    }
  }
  res.json({ itens, indisponiveis });
}

async function mensagens(req, res) {
  const pedido = await doCliente(req);
  res.json(await Mensagem.listar(pedido.id));
}

async function enviarMensagem(req, res) {
  const pedido = await doCliente(req);
  const texto = String((req.body || {}).texto || "").trim();
  if (!texto || texto.length > 500) throw new ErroApi("Escreva uma mensagem de até 500 caracteres.");
  const nova = await Mensagem.criar(pedido.id, "cliente", texto);
  avisarGerente("mensagem", pedido.id);
  res.status(201).json(nova);
}

module.exports = { criar, eventos, listar, ver, cancelar, repetir, mensagens, enviarMensagem };
