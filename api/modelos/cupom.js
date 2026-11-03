const pool = require("../config/database");
const { repetido } = require("../util/erros");

const CAMPOS =
  "codigo, percentual::float, apenas_primeiro_pedido, valor_minimo::float, to_char(valido_ate, 'YYYY-MM-DD') AS valido_ate, ativo";

async function listar() {
  const { rows } = await pool.query(`SELECT ${CAMPOS} FROM cupons ORDER BY codigo`);
  return rows;
}

async function ativo(codigo, con = pool) {
  const { rows } = await con.query(`SELECT ${CAMPOS} FROM cupons WHERE codigo = $1 AND ativo`, [codigo]);
  return rows[0] || null;
}

async function criar(codigo, d) {
  const { rows } = await pool
    .query(
      `INSERT INTO cupons (codigo, percentual, apenas_primeiro_pedido, valor_minimo, valido_ate, ativo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${CAMPOS}`,
      [codigo, d.percentual, d.primeiro, d.minimo, d.ate, d.ativo]
    )
    .catch(repetido("Já existe um cupom com esse código."));
  return rows[0];
}

async function atualizar(codigo, d) {
  const { rows } = await pool.query(
    `UPDATE cupons SET percentual=$2, apenas_primeiro_pedido=$3, valor_minimo=$4, valido_ate=$5, ativo=$6 WHERE codigo=$1 RETURNING ${CAMPOS}`,
    [codigo, d.percentual, d.primeiro, d.minimo, d.ate, d.ativo]
  );
  return rows[0] || null;
}

async function remover(codigo) {
  const { rowCount } = await pool.query("DELETE FROM cupons WHERE codigo = $1", [codigo]);
  return rowCount > 0;
}

module.exports = { listar, ativo, criar, atualizar, remover };
