const express = require("express");
const pool = require("../config/database");
const { gerarHash, conferirSenha, gerarToken, exigirLogin } = require("../util/seguranca");
const { ErroApi } = require("../util/erros");
const { limitarLogin } = require("../util/limite");
const { enviar } = require("../util/email");
const crypto = require("crypto");

const rotas = express.Router();
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function buscarCliente(id) {
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

function validarDados({ nome, email, telefone }) {
  if (!nome || String(nome).trim().length < 2) throw new ErroApi("Informe seu nome completo.");
  if (!REGEX_EMAIL.test(String(email || ""))) throw new ErroApi("E-mail inválido.");
  if (String(telefone || "").replace(/\D/g, "").length < 10) throw new ErroApi("Telefone inválido (inclua o DDD).");
}

rotas.post("/cadastro", async (req, res) => {
  const { nome, email, telefone, senha } = req.body || {};
  validarDados({ nome, email, telefone });
  if (String(senha || "").length < 6) throw new ErroApi("A senha precisa ter no mínimo 6 caracteres.");

  try {
    const { rows } = await pool.query(
      "INSERT INTO clientes (nome, email, telefone, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id",
      [String(nome).trim(), String(email).trim().toLowerCase(), String(telefone).trim(), await gerarHash(String(senha))]
    );
    res.status(201).json({ token: gerarToken(rows[0].id), cliente: await buscarCliente(rows[0].id) });
  } catch (erro) {
    if (erro.code === "23505") throw new ErroApi("Já existe uma conta com este e-mail.", 409);
    throw erro;
  }
});

rotas.post("/login", limitarLogin(), async (req, res) => {
  const { email, senha } = req.body || {};
  const { rows } = await pool.query("SELECT id, senha_hash FROM clientes WHERE email = $1", [
    String(email || "").trim().toLowerCase(),
  ]);
  if (!rows[0] || !(await conferirSenha(String(senha || ""), rows[0].senha_hash))) {
    req.loginFalhou();
    throw new ErroApi("E-mail ou senha incorretos.", 401);
  }
  req.loginOk();
  res.json({ token: gerarToken(rows[0].id), cliente: await buscarCliente(rows[0].id) });
});

const resumoToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

rotas.post("/esqueci", limitarLogin(), async (req, res) => {
  req.loginFalhou();
  const email = String((req.body || {}).email || "").trim().toLowerCase();
  if (!REGEX_EMAIL.test(email)) throw new ErroApi("Informe um e-mail válido.");
  const resposta = { mensagem: "Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha. Ele vale por 30 minutos." };
  const { rows } = await pool.query("SELECT id, nome FROM clientes WHERE email = $1", [email]);
  if (rows[0]) {
    const token = crypto.randomBytes(24).toString("base64url");
    await pool.query("DELETE FROM recuperacoes_senha WHERE cliente_id = $1", [rows[0].id]);
    await pool.query(
      "INSERT INTO recuperacoes_senha (cliente_id, token_hash, expira_em) VALUES ($1, $2, now() + interval '30 minutes')",
      [rows[0].id, resumoToken(token)]
    );
    const base = (process.env.SABOR_URL_CLIENTE || "http://localhost:5500").replace(/\/+$/, "");
    const link = `${base}/#/redefinir?token=${token}`;
    await enviar(email, "Nova senha - Sabor Caseiro", `Olá, ${rows[0].nome}! Para criar uma nova senha acesse: ${link}\nO link vale por 30 minutos.`);
    if (process.env.SABOR_DEV_LINK === "1") resposta.link = link;
  }
  res.json(resposta);
});

rotas.post("/redefinir", limitarLogin(), async (req, res) => {
  const { token, senha } = req.body || {};
  if (String(senha || "").length < 6) throw new ErroApi("A senha precisa ter no mínimo 6 caracteres.");
  const { rows } = await pool.query(
    "SELECT id, cliente_id FROM recuperacoes_senha WHERE token_hash = $1 AND expira_em > now()",
    [resumoToken(String(token || ""))]
  );
  if (!rows[0]) {
    req.loginFalhou();
    throw new ErroApi("Link inválido ou expirado. Peça um novo.", 400);
  }
  await pool.query("UPDATE clientes SET senha_hash = $2 WHERE id = $1", [rows[0].cliente_id, await gerarHash(String(senha))]);
  await pool.query("DELETE FROM recuperacoes_senha WHERE cliente_id = $1", [rows[0].cliente_id]);
  res.json({ mensagem: "Senha alterada. Entre com a nova senha." });
});

rotas.get("/eu", exigirLogin, async (req, res) => {
  const cliente = await buscarCliente(req.clienteId);
  if (!cliente) throw new ErroApi("Sessão inválida.", 401);
  res.json(cliente);
});

rotas.put("/eu", exigirLogin, async (req, res) => {
  const { nome, email, telefone, senha_atual, nova_senha } = req.body || {};
  validarDados({ nome, email, telefone });
  let novoHash = null;
  if (nova_senha) {
    if (String(nova_senha).length < 6) throw new ErroApi("A nova senha precisa ter no mínimo 6 caracteres.");
    const { rows } = await pool.query("SELECT senha_hash FROM clientes WHERE id = $1", [req.clienteId]);
    if (!rows[0] || !(await conferirSenha(String(senha_atual || ""), rows[0].senha_hash))) {
      throw new ErroApi("A senha atual está incorreta.", 401);
    }
    novoHash = await gerarHash(String(nova_senha));
  }
  try {
    await pool.query(
      "UPDATE clientes SET nome = $1, email = $2, telefone = $3, senha_hash = COALESCE($4, senha_hash) WHERE id = $5",
      [String(nome).trim(), String(email).trim().toLowerCase(), String(telefone).trim(), novoHash, req.clienteId]
    );
  } catch (erro) {
    if (erro.code === "23505") throw new ErroApi("Já existe uma conta com este e-mail.", 409);
    throw erro;
  }
  res.json(await buscarCliente(req.clienteId));
});

rotas.delete("/eu", exigirLogin, async (req, res) => {
  const { rows } = await pool.query("SELECT senha_hash FROM clientes WHERE id = $1", [req.clienteId]);
  if (!rows[0] || !(await conferirSenha(String((req.body || {}).senha || ""), rows[0].senha_hash))) {
    throw new ErroApi("Senha incorreta.", 401);
  }
  const con = await pool.connect();
  try {
    await con.query("BEGIN");
    await con.query(
      `UPDATE pedidos SET cliente_id = NULL, nome_cliente = 'Cliente removido', telefone = '-',
              cep = NULL, rua = NULL, numero = NULL, complemento = NULL WHERE cliente_id = $1`,
      [req.clienteId]
    );
    await con.query("DELETE FROM clientes WHERE id = $1", [req.clienteId]);
    await con.query("COMMIT");
  } catch (erro) {
    await con.query("ROLLBACK");
    throw erro;
  } finally {
    con.release();
  }
  res.json({ ok: true });
});

module.exports = rotas;
