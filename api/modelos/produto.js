const pool = require("../config/database");
const { repetido } = require("../util/erros");

const CAMPOS = "id, nome, categoria, preco_extra::float, ativo";
const REPETIDO = "Já existe um produto com esse nome nessa categoria.";

async function listar() {
  const { rows } = await pool.query(`SELECT ${CAMPOS} FROM ingredientes ORDER BY categoria, nome`);
  return rows;
}

async function criar(d) {
  const { rows } = await pool
    .query(`INSERT INTO ingredientes (nome, categoria, preco_extra, ativo) VALUES ($1,$2,$3,$4) RETURNING ${CAMPOS}`, [
      d.nome,
      d.categoria,
      d.preco_extra,
      d.ativo,
    ])
    .catch(repetido(REPETIDO));
  return rows[0];
}

async function atualizar(id, d) {
  const { rows } = await pool
    .query(`UPDATE ingredientes SET nome=$2, categoria=$3, preco_extra=$4, ativo=$5 WHERE id=$1 RETURNING ${CAMPOS}`, [
      id,
      d.nome,
      d.categoria,
      d.preco_extra,
      d.ativo,
    ])
    .catch(repetido(REPETIDO));
  return rows[0] || null;
}

async function remover(id) {
  const { rowCount } = await pool.query("DELETE FROM ingredientes WHERE id = $1", [id]);
  return rowCount > 0;
}

async function extrasAtivos(con = pool) {
  const { rows } = await con.query("SELECT id, nome, categoria, preco_extra FROM ingredientes WHERE ativo AND categoria = 'extra'");
  return rows;
}

module.exports = { listar, criar, atualizar, remover, extrasAtivos };
