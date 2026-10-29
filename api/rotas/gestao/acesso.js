const express = require("express");
const pool = require("../../config/database");
const { conferirSenha, gerarToken, exigirGerente } = require("../../util/seguranca");
const { ErroApi } = require("../../util/erros");
const { texto } = require("../../util/validar");
const { limitarLogin } = require("../../util/limite");

const rota = express.Router();

rota.post("/login", limitarLogin(), async (req, res) => {
  const dados = req.body || {};
  const email = texto(dados.email, "E-mail", 3, 120).toLowerCase();
  const senha = texto(dados.senha, "Senha", 1, 100);
  const { rows } = await pool.query("SELECT id, nome, email, senha_hash FROM gerentes WHERE email = $1", [email]);
  const gerente = rows[0];
  if (!gerente || !(await conferirSenha(senha, gerente.senha_hash))) {
    req.loginFalhou();
    throw new ErroApi("E-mail ou senha incorretos.", 401);
  }
  req.loginOk();
  res.json({ token: gerarToken(gerente.id, "gerente"), gerente: { id: gerente.id, nome: gerente.nome, email: gerente.email } });
});

rota.get("/eu", exigirGerente, async (req, res) => {
  const { rows } = await pool.query("SELECT id, nome, email FROM gerentes WHERE id = $1", [req.gerenteId]);
  if (!rows[0]) throw new ErroApi("Sessão inválida.", 401);
  res.json(rows[0]);
});

module.exports = rota;
