const pool = require("../config/database");

async function listar(pedidoId, con = pool) {
  const { rows } = await con.query("SELECT id, autor, texto, criado_em FROM mensagens WHERE pedido_id = $1 ORDER BY id", [pedidoId]);
  return rows;
}

async function criar(pedidoId, autor, texto, con = pool) {
  const { rows } = await con.query(
    "INSERT INTO mensagens (pedido_id, autor, texto) VALUES ($1, $2, $3) RETURNING id, autor, texto, criado_em",
    [pedidoId, autor, texto]
  );
  return rows[0];
}

module.exports = { listar, criar };
