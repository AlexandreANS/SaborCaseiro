const pool = require("../config/database");
const transacao = require("./transacao");
const mensagem = require("./mensagem");
const { ErroApi } = require("../util/erros");
const { comRotulo, passosDe } = require("../visoes/pedido");

const CAMPOS = `p.id, p.status, p.tipo_entrega, p.nome_cliente, p.telefone, p.cep, p.rua, p.numero, p.complemento,
  p.bairro_nome, p.forma_pagamento, p.troco_para::float, to_char(p.horario_agendado, 'HH24:MI') AS horario_agendado,
  p.observacoes, p.cupom, p.subtotal::float, p.adicionais::float, p.desconto::float, p.taxa_entrega::float,
  p.total::float, p.motivo_recusa, p.cancelado_por, p.criado_em`;

const RESUMO = `(SELECT string_agg(pi.quantidade || 'x ' || pi.tipo_nome, ', ' ORDER BY pi.extra, pi.id) FROM pedido_itens pi WHERE pi.pedido_id = p.id) AS resumo,
            (SELECT count(*)::int FROM mensagens m WHERE m.pedido_id = p.id) AS total_msgs`;

async function buscar(id, clienteId = null, con = pool) {
  const filtro = clienteId ? "AND p.cliente_id = $2" : "";
  const { rows } = await con.query(`SELECT ${CAMPOS} FROM pedidos p WHERE p.id = $1 ${filtro}`, clienteId ? [id, clienteId] : [id]);
  if (!rows[0]) return null;
  const itens = await con.query(
    `SELECT pi.id, pi.tipo_nome, pi.extra, pi.quantidade, pi.preco_unitario::float, pi.observacoes,
            COALESCE(json_agg(json_build_object('nome', ii.nome, 'categoria', ii.categoria, 'preco_extra', ii.preco_extra::float, 'adicional', ii.adicional)
                     ORDER BY ii.adicional, ii.nome) FILTER (WHERE ii.nome IS NOT NULL), '[]') AS ingredientes
       FROM pedido_itens pi LEFT JOIN pedido_item_ingredientes ii ON ii.item_id = pi.id
      WHERE pi.pedido_id = $1 GROUP BY pi.id ORDER BY pi.id`,
    [id]
  );
  const pedido = comRotulo(rows[0]);
  return { ...pedido, passos: passosDe(pedido.tipo_entrega), itens: itens.rows };
}

async function doCliente(clienteId, limite) {
  const { rows } = await pool.query(
    `SELECT p.id, p.status, p.tipo_entrega, p.forma_pagamento, p.total::float, p.criado_em, p.cancelado_por, ${RESUMO}
       FROM pedidos p WHERE p.cliente_id = $1 ORDER BY p.id DESC LIMIT $2`,
    [clienteId, limite]
  );
  return rows.map(comRotulo);
}

async function daGestao(status, limite) {
  const { rows } = await pool.query(
    `SELECT p.id, p.status, p.tipo_entrega, p.nome_cliente, p.telefone, p.forma_pagamento, p.total::float, p.criado_em, p.cancelado_por, ${RESUMO}
       FROM pedidos p
      WHERE ($1::text IS NULL OR p.status = $1)
      ORDER BY CASE p.status WHEN 'Esperando' THEN 0 WHEN 'Preparando' THEN 1 WHEN 'Saiu para Entrega' THEN 2 WHEN 'Pronto para Retirada' THEN 2 ELSE 3 END, p.id DESC
      LIMIT $2`,
    [status, limite]
  );
  return rows.map(comRotulo);
}

async function contagem() {
  const { rows } = await pool.query("SELECT status, count(*)::int AS n FROM pedidos GROUP BY status");
  return rows;
}

async function clienteDe(id) {
  const { rows } = await pool.query("SELECT cliente_id FROM pedidos WHERE id = $1", [id]);
  return rows[0] ? rows[0].cliente_id : null;
}

async function idPorChave(clienteId, chave, con = pool) {
  const { rows } = await con.query("SELECT id FROM pedidos WHERE cliente_id = $1 AND chave_envio = $2", [clienteId, chave]);
  return rows[0] ? rows[0].id : null;
}

async function criar(con, d, cot, clienteId) {
  const { rows } = await con.query(
    `INSERT INTO pedidos (cliente_id, tipo_entrega, nome_cliente, telefone, cep, rua, numero, complemento,
                          bairro_id, bairro_nome, forma_pagamento, troco_para, horario_agendado, observacoes,
                          cupom, subtotal, adicionais, desconto, taxa_entrega, total, chave_envio)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING id`,
    [
      clienteId,
      d.tipo_entrega,
      d.nome,
      d.telefone,
      d.entrega ? d.endereco.cep || null : null,
      d.entrega ? d.endereco.rua : null,
      d.entrega ? d.endereco.numero : null,
      d.entrega ? d.endereco.complemento || null : null,
      cot.bairro ? cot.bairro.id : null,
      cot.bairro ? cot.bairro.nome : null,
      d.forma_pagamento,
      d.troco,
      d.horario,
      d.observacoes,
      cot.cupom,
      cot.subtotal,
      cot.adicionais,
      cot.desconto,
      cot.taxa_entrega || 0,
      cot.total,
      d.chave,
    ]
  );
  const id = rows[0].id;
  for (const item of cot.itens) {
    const novo = await con.query(
      `INSERT INTO pedido_itens (pedido_id, tipo_id, tipo_nome, extra, produto_id, quantidade, preco_unitario, observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [id, item.tipo_id, item.tipo_nome, item.extra, item.produto_id, item.quantidade, item.preco_unitario, item.observacoes]
    );
    for (const ing of item.ingredientes) {
      await con.query(
        "INSERT INTO pedido_item_ingredientes (item_id, ingrediente_id, nome, categoria, preco_extra, adicional) VALUES ($1,$2,$3,$4,$5,$6)",
        [novo.rows[0].id, ing.id, ing.nome, ing.categoria, ing.preco_extra, ing.adicional]
      );
    }
  }
  return id;
}

async function paraRepetir(id) {
  const { rows } = await pool.query(
    `SELECT i.id, i.tipo_id, i.tipo_nome, i.extra, i.produto_id, i.quantidade, i.observacoes,
            COALESCE((SELECT array_agg(x.ingrediente_id ORDER BY x.ingrediente_id) FROM pedido_item_ingredientes x WHERE x.item_id = i.id AND NOT x.adicional), '{}') AS ingredientes,
            COALESCE((SELECT array_agg(x.ingrediente_id ORDER BY x.ingrediente_id) FROM pedido_item_ingredientes x WHERE x.item_id = i.id AND x.adicional), '{}') AS adicionais,
            (SELECT count(*)::int FROM pedido_item_ingredientes x WHERE x.item_id = i.id AND x.ingrediente_id IS NULL) AS orfaos
       FROM pedido_itens i WHERE i.pedido_id = $1 ORDER BY i.id`,
    [id]
  );
  return rows;
}

function cancelarPeloCliente(id, clienteId) {
  return transacao(async (con) => {
    const { rowCount } = await con.query(
      "UPDATE pedidos SET status = 'Cancelado', cancelado_por = 'cliente' WHERE id = $1 AND cliente_id = $2 AND status = 'Esperando'",
      [id, clienteId]
    );
    if (!rowCount) throw new ErroApi("O restaurante já respondeu ao pedido. Fale com a equipe pelo chat.", 409);
    await mensagem.criar(id, "cliente", "Pedido cancelado pelo cliente.", con);
  });
}

async function aceitar(id) {
  const { rowCount } = await pool.query("UPDATE pedidos SET status = 'Preparando' WHERE id = $1 AND status = 'Esperando'", [id]);
  if (!rowCount) throw new ErroApi("Este pedido já foi atualizado por outra pessoa.", 409);
}

function recusar(id, motivo) {
  return transacao(async (con) => {
    const { rowCount } = await con.query(
      "UPDATE pedidos SET status = 'Cancelado', motivo_recusa = $2, cancelado_por = 'equipe' WHERE id = $1 AND status = 'Esperando'",
      [id, motivo]
    );
    if (!rowCount) throw new ErroApi("Este pedido já foi atualizado por outra pessoa.", 409);
    await mensagem.criar(id, "equipe", motivo, con);
  });
}

async function mudarStatus(id, novo, atual) {
  const { rowCount } = await pool.query("UPDATE pedidos SET status = $2 WHERE id = $1 AND status = $3", [id, novo, atual]);
  if (!rowCount) throw new ErroApi("Este pedido já foi atualizado por outra pessoa.", 409);
}

module.exports = {
  idPorChave,
  buscar,
  doCliente,
  daGestao,
  contagem,
  clienteDe,
  criar,
  paraRepetir,
  cancelarPeloCliente,
  aceitar,
  recusar,
  mudarStatus,
};
