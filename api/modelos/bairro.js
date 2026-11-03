const pool = require("../config/database");
const { repetido } = require("../util/erros");

const CAMPOS = "id, nome, taxa_entrega::float, ativo";
const REPETIDO = "Já existe um bairro com esse nome.";

async function ativos() {
  const { rows } = await pool.query("SELECT id, nome, taxa_entrega::float FROM bairros WHERE ativo ORDER BY nome");
  return rows;
}

async function ativo(id, con = pool) {
  const { rows } = await con.query("SELECT id, nome, taxa_entrega::float FROM bairros WHERE ativo AND id = $1", [id]);
  return rows[0] || null;
}

async function todos() {
  const { rows } = await pool.query(`SELECT ${CAMPOS} FROM bairros ORDER BY nome`);
  return rows;
}

async function criar(d) {
  const { rows } = await pool
    .query(`INSERT INTO bairros (nome, taxa_entrega, ativo) VALUES ($1,$2,$3) RETURNING ${CAMPOS}`, [d.nome, d.taxa, d.ativo])
    .catch(repetido(REPETIDO));
  return rows[0];
}

async function atualizar(id, d) {
  const { rows } = await pool
    .query(`UPDATE bairros SET nome=$2, taxa_entrega=$3, ativo=$4 WHERE id=$1 RETURNING ${CAMPOS}`, [id, d.nome, d.taxa, d.ativo])
    .catch(repetido(REPETIDO));
  return rows[0] || null;
}

async function remover(id) {
  const { rowCount } = await pool.query("DELETE FROM bairros WHERE id = $1", [id]);
  return rowCount > 0;
}

module.exports = { ativos, ativo, todos, criar, atualizar, remover };
