const express = require("express");
const { exigirLogin } = require("../util/seguranca");
const { limitarLogin, limitarCadastro, limitarSenha } = require("../util/limite");
const c = require("../controladores/acesso");

const rotas = express.Router();

rotas.post("/cadastro", limitarCadastro(), c.cadastro);
rotas.post("/login", limitarLogin(), c.login);
rotas.post("/esqueci", limitarLogin(), c.esqueci);
rotas.post("/redefinir", limitarLogin(), c.redefinir);
rotas.get("/eu", exigirLogin, c.perfil);
rotas.put(
  "/eu",
  exigirLogin,
  limitarSenha((req) => !!(req.body && req.body.nova_senha)),
  c.atualizar
);
rotas.put("/eu/endereco", exigirLogin, c.salvarEndereco);
rotas.delete("/eu/endereco", exigirLogin, c.apagarEndereco);
rotas.delete(
  "/eu",
  exigirLogin,
  limitarSenha(() => true),
  c.remover
);

module.exports = rotas;
