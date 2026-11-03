const pool = require("../config/database");
const { repetido } = require("../util/erros");

const REPETIDA = "Essa mensagem já existe.";

async function listar() {
  const { rows } = await pool.query("SELECT id, texto FROM mensagens_recusa ORDER BY id");
  return rows;
}

async function texto(id) {
  const { rows } = await pool.query("SELECT texto FROM mensagens_recusa WHERE id = $1", [id]);
  return rows[0] ? rows[0].texto : null;
}

async function criar(t) {
  const { rows } = await pool.query("INSERT INTO mensagens_recusa (texto) VALUES ($1) RETURNING id, texto", [t]).catch(repetido(REPETIDA));
  return rows[0];
}

async function atualizar(id, t) {
  const { rows } = await pool
    .query("UPDATE mensagens_recusa SET texto = $2 WHERE id = $1 RETURNING id, texto", [id, t])
    .catch(repetido(REPETIDA));
  return rows[0] || null;
}

async function remover(id) {
  const { rowCount } = await pool.query("DELETE FROM mensagens_recusa WHERE id = $1", [id]);
  return rowCount > 0;
}

module.exports = { listar, texto, criar, atualizar, remover };
