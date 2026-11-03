const Gerente = require("../../modelos/gerente");
const { conferirSenha, gerarToken } = require("../../util/seguranca");
const { ErroApi } = require("../../util/erros");
const { texto } = require("../../util/validar");

async function login(req, res) {
  const d = req.body || {};
  const gerente = await Gerente.porEmail(texto(d.email, "E-mail", 3, 120).toLowerCase());
  if (!gerente || !(await conferirSenha(texto(d.senha, "Senha", 1, 100), gerente.senha_hash))) {
    req.loginFalhou();
    throw new ErroApi("E-mail ou senha incorretos.", 401);
  }
  req.loginOk();
  res.json({ token: gerarToken(gerente.id, "gerente"), gerente: { id: gerente.id, nome: gerente.nome, email: gerente.email } });
}

async function perfil(req, res) {
  const gerente = await Gerente.porId(req.gerenteId);
  if (!gerente) throw new ErroApi("Sessão inválida.", 401);
  res.json(gerente);
}

module.exports = { login, perfil };
