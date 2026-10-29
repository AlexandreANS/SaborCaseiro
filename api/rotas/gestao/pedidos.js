const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");
const { texto, idDaRota } = require("../../util/validar");
const { avisarCliente } = require("../../util/eventos");
const { buscarPedido, listarMensagens, PASSOS, STATUS, comRotulo } = require("../../util/pedidos");

const rota = express.Router();

async function carregar(id) {
  const pedido = await buscarPedido(idDaRota(id));
  if (!pedido) throw new ErroApi("Pedido não encontrado.", 404);
  return pedido;
}

rota.get("/contagem", async (req, res) => {
  const { rows } = await pool.query("SELECT status, count(*)::int AS n FROM pedidos GROUP BY status");
  const contagem = Object.fromEntries(STATUS.map((s) => [s, 0]));
  rows.forEach((r) => { contagem[r.status] = r.n; });
  res.json({ ...contagem, total: rows.reduce((soma, r) => soma + r.n, 0) });
});

rota.get("/", async (req, res) => {
  const status = req.query.status;
  if (status && !STATUS.includes(status)) throw new ErroApi("Status inválido.");
  const limite = Math.min(500, Math.max(1, Number(req.query.limite) || 50));
  const { rows } = await pool.query(
    `SELECT p.id, p.status, p.tipo_entrega, p.nome_cliente, p.telefone, p.forma_pagamento, p.total::float, p.criado_em, p.cancelado_por,
            (SELECT string_agg(pi.quantidade || 'x ' || pi.tipo_nome, ', ' ORDER BY pi.extra, pi.id) FROM pedido_itens pi WHERE pi.pedido_id = p.id) AS resumo,
            (SELECT count(*)::int FROM mensagens m WHERE m.pedido_id = p.id) AS total_msgs
       FROM pedidos p
      WHERE ($1::text IS NULL OR p.status = $1)
      ORDER BY CASE p.status WHEN 'Esperando' THEN 0 WHEN 'Preparando' THEN 1 WHEN 'Saiu para Entrega' THEN 2 WHEN 'Pronto para Retirada' THEN 2 ELSE 3 END, p.id DESC
      LIMIT $2`,
    [status || null, limite]
  );
  res.json(rows.map(comRotulo));
});

rota.get("/:id", async (req, res) => {
  const pedido = await carregar(req.params.id);
  res.json({ ...pedido, mensagens: await listarMensagens(pedido.id) });
});

rota.post("/:id/aceitar", async (req, res) => {
  const pedido = await carregar(req.params.id);
  if (pedido.status !== "Esperando") throw new ErroApi("Só é possível aceitar pedidos em espera.", 409);
  const { rowCount } = await pool.query("UPDATE pedidos SET status = 'Preparando' WHERE id = $1 AND status = 'Esperando'", [pedido.id]);
  if (!rowCount) throw new ErroApi("Este pedido já foi atualizado por outra pessoa.", 409);
  avisarCliente(pedido.id, "pedido");
  res.json(await carregar(pedido.id));
});

rota.post("/:id/recusar", async (req, res) => {
  const pedido = await carregar(req.params.id);
  if (pedido.status !== "Esperando") throw new ErroApi("Só é possível recusar pedidos em espera.", 409);
  let motivo = req.body.motivo;
  if (req.body.mensagem_id) {
    const { rows } = await pool.query("SELECT texto FROM mensagens_recusa WHERE id = $1", [idDaRota(req.body.mensagem_id)]);
    if (!rows[0]) throw new ErroApi("Mensagem de recusa não encontrada.", 404);
    motivo = rows[0].texto;
  }
  motivo = texto(motivo, "Motivo da recusa", 3, 300);
  const con = await pool.connect();
  try {
    await con.query("BEGIN");
    const { rowCount } = await con.query("UPDATE pedidos SET status = 'Cancelado', motivo_recusa = $2, cancelado_por = 'equipe' WHERE id = $1 AND status = 'Esperando'", [pedido.id, motivo]);
    if (!rowCount) throw new ErroApi("Este pedido já foi atualizado por outra pessoa.", 409);
    await con.query("INSERT INTO mensagens (pedido_id, autor, texto) VALUES ($1, 'equipe', $2)", [pedido.id, motivo]);
    await con.query("COMMIT");
  } catch (erro) {
    await con.query("ROLLBACK");
    throw erro;
  } finally {
    con.release();
  }
  avisarCliente(pedido.id, "pedido");
  res.json(await carregar(pedido.id));
});

rota.put("/:id/status", async (req, res) => {
  const pedido = await carregar(req.params.id);
  const novo = req.body.status;
  if (!STATUS.includes(novo)) throw new ErroApi("Status inválido.");
  if (pedido.status === "Esperando") throw new ErroApi("Aceite ou recuse o pedido antes de mudar o status.", 409);
  if (pedido.status === "Concluído" || pedido.status === "Cancelado") throw new ErroApi("Este pedido já foi encerrado.", 409);
  if (novo === "Esperando" || novo === "Cancelado" || !PASSOS[pedido.tipo_entrega].includes(novo)) {
    throw new ErroApi("Mudança de status não permitida para este pedido.", 409);
  }
  if (novo === pedido.status) throw new ErroApi("O pedido já está nesse status.", 409);
  const { rowCount } = await pool.query("UPDATE pedidos SET status = $2 WHERE id = $1 AND status = $3", [pedido.id, novo, pedido.status]);
  if (!rowCount) throw new ErroApi("Este pedido já foi atualizado por outra pessoa.", 409);
  avisarCliente(pedido.id, "pedido");
  res.json(await carregar(pedido.id));
});

rota.get("/:id/mensagens", async (req, res) => {
  const pedido = await carregar(req.params.id);
  res.json(await listarMensagens(pedido.id));
});

rota.post("/:id/mensagens", async (req, res) => {
  const pedido = await carregar(req.params.id);
  const msg = texto(req.body.texto, "Mensagem", 1, 500);
  await pool.query("INSERT INTO mensagens (pedido_id, autor, texto) VALUES ($1, 'equipe', $2)", [pedido.id, msg]);
  avisarCliente(pedido.id, "mensagem");
  res.status(201).json(await listarMensagens(pedido.id));
});

module.exports = rota;
