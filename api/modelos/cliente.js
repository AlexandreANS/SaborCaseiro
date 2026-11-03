const pool = require("../config/database");
const transacao = require("./transacao");
const { repetido } = require("../util/erros");

const EMAIL_REPETIDO = "Já existe uma conta com este e-mail.";

async function buscar(id) {
  const { rows } = await pool.query(
    `SELECT c.id, c.nome, c.email, c.telefone,
            e.cep, e.rua, e.numero, e.complemento, e.bairro_id
       FROM clientes c LEFT JOIN enderecos e ON e.cliente_id = c.id
      WHERE c.id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const { cep, rua, numero, complemento, bairro_id, ...cliente } = rows[0];
  cliente.endereco = rua ? { cep, rua, numero, complemento, bairro_id } : null;
  return cliente;
}

async function sessaoValida(id, versao) {
  const { rows } = await pool.query("SELECT 1 FROM clientes WHERE id = $1 AND sessao_versao = $2", [id, versao]);
  return rows.length > 0;
}

async function versaoDe(id) {
  const { rows } = await pool.query("SELECT sessao_versao FROM clientes WHERE id = $1", [id]);
  return rows[0] ? rows[0].sessao_versao : 0;
}

async function porEmail(email) {
  const { rows } = await pool.query("SELECT id, nome, senha_hash, sessao_versao FROM clientes WHERE email = $1", [email]);
  return rows[0] || null;
}

async function senhaHash(id) {
  const { rows } = await pool.query("SELECT senha_hash FROM clientes WHERE id = $1", [id]);
  return rows[0] ? rows[0].senha_hash : null;
}

async function criar({ nome, email, telefone, hash }) {
  const { rows } = await pool
    .query("INSERT INTO clientes (nome, email, telefone, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id", [nome, email, telefone, hash])
    .catch(repetido(EMAIL_REPETIDO));
  return rows[0].id;
}

async function atualizar(id, { nome, email, telefone }, hash) {
  await pool
    .query(
      `UPDATE clientes SET nome = $1, email = $2, telefone = $3, senha_hash = COALESCE($4, senha_hash),
              sessao_versao = sessao_versao + ($4::text IS NOT NULL)::int
        WHERE id = $5`,
      [nome, email, telefone, hash, id]
    )
    .catch(repetido(EMAIL_REPETIDO));
}

async function trocarSenha(id, hash) {
  await pool.query("UPDATE clientes SET senha_hash = $2, sessao_versao = sessao_versao + 1 WHERE id = $1", [id, hash]);
}

function remover(id) {
  return transacao(async (con) => {
    await con.query(
      `UPDATE pedidos SET cliente_id = NULL, nome_cliente = 'Cliente removido', telefone = '-',
              cep = NULL, rua = NULL, numero = NULL, complemento = NULL WHERE cliente_id = $1`,
      [id]
    );
    await con.query("DELETE FROM clientes WHERE id = $1", [id]);
  });
}

function salvarEndereco(con, clienteId, e, bairroId) {
  return con.query(
    `INSERT INTO enderecos (cliente_id, cep, rua, numero, complemento, bairro_id) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (cliente_id) DO UPDATE SET cep=$2, rua=$3, numero=$4, complemento=$5, bairro_id=$6`,
    [clienteId, e.cep || null, e.rua, e.numero, e.complemento || null, bairroId]
  );
}

function removerEndereco(clienteId) {
  return pool.query("DELETE FROM enderecos WHERE cliente_id = $1", [clienteId]);
}

async function jaPediu(clienteId, con = pool) {
  const { rows } = await con.query("SELECT 1 FROM pedidos WHERE cliente_id = $1 AND status <> 'Cancelado' LIMIT 1", [clienteId]);
  return rows.length > 0;
}

module.exports = {
  sessaoValida,
  versaoDe,
  removerEndereco,
  buscar,
  porEmail,
  senhaHash,
  criar,
  atualizar,
  trocarSenha,
  remover,
  salvarEndereco,
  jaPediu,
};
