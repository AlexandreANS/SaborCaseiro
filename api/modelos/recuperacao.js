const pool = require("../config/database");

async function emailDe(email) {
  const { rows } = await pool.query("SELECT id, nome FROM clientes WHERE email = $1", [email]);
  return rows[0] || null;
}

async function criar(clienteId, tokenHash) {
  await pool.query("DELETE FROM recuperacoes_senha WHERE cliente_id = $1", [clienteId]);
  await pool.query("INSERT INTO recuperacoes_senha (cliente_id, token_hash, expira_em) VALUES ($1, $2, now() + interval '30 minutes')", [
    clienteId,
    tokenHash,
  ]);
}

async function buscar(tokenHash) {
  const { rows } = await pool.query("SELECT id, cliente_id FROM recuperacoes_senha WHERE token_hash = $1 AND expira_em > now()", [
    tokenHash,
  ]);
  return rows[0] || null;
}

async function apagar(clienteId) {
  await pool.query("DELETE FROM recuperacoes_senha WHERE cliente_id = $1", [clienteId]);
}

module.exports = { emailDe, criar, buscar, apagar };
