const pool = require("../config/database");

const PASSOS = {
  entrega: ["Esperando", "Preparando", "Saiu para Entrega", "Concluído"],
  retirada: ["Esperando", "Preparando", "Pronto para Retirada", "Concluído"],
};
const STATUS = ["Esperando", "Preparando", "Saiu para Entrega", "Pronto para Retirada", "Concluído", "Cancelado"];

function rotuloStatus(status, tipo, por = null) {
  if (status === "Esperando") return "Aguardando aceite";
  if (status === "Cancelado") return por === "cliente" ? "Cancelado" : "Recusado";
  if (status === "Concluído") return tipo === "retirada" ? "Retirado" : "Entregue";
  return status;
}

const comRotulo = (p) => ({ ...p, status_rotulo: rotuloStatus(p.status, p.tipo_entrega, p.cancelado_por) });

const CAMPOS = `p.id, p.status, p.tipo_entrega, p.nome_cliente, p.telefone, p.cep, p.rua, p.numero, p.complemento,
  p.bairro_nome, p.forma_pagamento, p.troco_para::float, to_char(p.horario_agendado, 'HH24:MI') AS horario_agendado,
  p.observacoes, p.cupom, p.subtotal::float, p.adicionais::float, p.desconto::float, p.taxa_entrega::float,
  p.total::float, p.motivo_recusa, p.cancelado_por, p.criado_em`;

async function buscarPedido(id, clienteId = null, con = pool) {
  const filtro = clienteId ? "AND p.cliente_id = $2" : "";
  const { rows } = await con.query(
    `SELECT ${CAMPOS} FROM pedidos p WHERE p.id = $1 ${filtro}`,
    clienteId ? [id, clienteId] : [id]
  );
  if (!rows[0]) return null;
  const itens = await con.query(
    `SELECT pi.id, pi.tipo_nome, pi.extra, pi.quantidade, pi.preco_unitario::float, pi.observacoes,
            COALESCE(json_agg(json_build_object('nome', ii.nome, 'categoria', ii.categoria, 'preco_extra', ii.preco_extra::float)
                     ORDER BY ii.nome) FILTER (WHERE ii.nome IS NOT NULL), '[]') AS ingredientes
       FROM pedido_itens pi LEFT JOIN pedido_item_ingredientes ii ON ii.item_id = pi.id
      WHERE pi.pedido_id = $1 GROUP BY pi.id ORDER BY pi.id`,
    [id]
  );
  const pedido = comRotulo(rows[0]);
  const passos = PASSOS[pedido.tipo_entrega].map((status) => ({ status, rotulo: rotuloStatus(status, pedido.tipo_entrega) }));
  return { ...pedido, passos, itens: itens.rows };
}

async function listarMensagens(pedidoId, con = pool) {
  const { rows } = await con.query(
    "SELECT id, autor, texto, criado_em FROM mensagens WHERE pedido_id = $1 ORDER BY id",
    [pedidoId]
  );
  return rows;
}

module.exports = { buscarPedido, listarMensagens, PASSOS, STATUS, rotuloStatus, comRotulo };
