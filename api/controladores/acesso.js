const crypto = require("crypto");
const pool = require("../config/database");
const Cliente = require("../modelos/cliente");
const Recuperacao = require("../modelos/recuperacao");
const { gerarHash, conferirSenha, gerarToken } = require("../util/seguranca");
const { ErroApi } = require("../util/erros");
const { enviar } = require("../util/email");
const { localizar } = require("../servicos/cep");

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const resumoToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

function validarSenha(senha, nome) {
  const t = String(senha || "");
  if (t.length < 6) throw new ErroApi(`${nome} precisa ter no mínimo 6 caracteres.`);
  if (t.length > 128) throw new ErroApi(`${nome} pode ter no máximo 128 caracteres.`);
}

function validarDados({ nome, email, telefone }) {
  if (!nome || String(nome).trim().length < 2) throw new ErroApi("Informe seu nome completo.");
  if (!REGEX_EMAIL.test(String(email || ""))) throw new ErroApi("E-mail inválido.");
  if (String(telefone || "").replace(/\D/g, "").length < 10) throw new ErroApi("Telefone inválido (inclua o DDD).");
}

const limpar = ({ nome, email, telefone }) => ({
  nome: String(nome).trim(),
  email: String(email).trim().toLowerCase(),
  telefone: String(telefone).trim(),
});

async function cadastro(req, res) {
  const d = req.body || {};
  validarDados(d);
  validarSenha(d.senha, "A senha");
  const id = await Cliente.criar({ ...limpar(d), hash: await gerarHash(String(d.senha)) });
  res.status(201).json({ token: gerarToken(id, "cliente", await Cliente.versaoDe(id)), cliente: await Cliente.buscar(id) });
}

async function login(req, res) {
  const { email, senha } = req.body || {};
  const achado = await Cliente.porEmail(
    String(email || "")
      .trim()
      .toLowerCase()
  );
  if (!achado || !(await conferirSenha(String(senha || ""), achado.senha_hash))) {
    req.loginFalhou();
    throw new ErroApi("E-mail ou senha incorretos.", 401);
  }
  req.loginOk();
  res.json({ token: gerarToken(achado.id, "cliente", achado.sessao_versao), cliente: await Cliente.buscar(achado.id) });
}

async function esqueci(req, res) {
  req.loginFalhou();
  const email = String((req.body || {}).email || "")
    .trim()
    .toLowerCase();
  if (!REGEX_EMAIL.test(email)) throw new ErroApi("Informe um e-mail válido.");
  const resposta = { mensagem: "Se o e-mail estiver cadastrado, enviamos um link para criar uma nova senha. Ele vale por 30 minutos." };
  const cliente = await Recuperacao.emailDe(email);
  if (cliente) {
    const token = crypto.randomBytes(24).toString("base64url");
    await Recuperacao.criar(cliente.id, resumoToken(token));
    const base = (process.env.SABOR_URL_CLIENTE || "http://localhost:5500").replace(/\/+$/, "");
    const link = `${base}/#/redefinir?token=${token}`;
    await enviar(
      email,
      "Nova senha - Sabor Caseiro",
      `Olá, ${cliente.nome}! Para criar uma nova senha acesse: ${link}\nO link vale por 30 minutos.`
    );
    if (process.env.SABOR_DEV_LINK === "1") resposta.link = link;
  }
  res.json(resposta);
}

async function redefinir(req, res) {
  const { token, senha } = req.body || {};
  validarSenha(senha, "A senha");
  const pedido = await Recuperacao.buscar(resumoToken(String(token || "")));
  if (!pedido) {
    req.loginFalhou();
    throw new ErroApi("Link inválido ou expirado. Peça um novo.", 400);
  }
  await Cliente.trocarSenha(pedido.cliente_id, await gerarHash(String(senha)));
  await Recuperacao.apagar(pedido.cliente_id);
  res.json({ mensagem: "Senha alterada. Entre com a nova senha." });
}

async function perfil(req, res) {
  const cliente = await Cliente.buscar(req.clienteId);
  if (!cliente) throw new ErroApi("Sessão inválida.", 401);
  res.json(cliente);
}

async function atualizar(req, res) {
  const d = req.body || {};
  validarDados(d);
  let hash = null;
  if (d.nova_senha) {
    validarSenha(d.nova_senha, "A nova senha");
    const atual = await Cliente.senhaHash(req.clienteId);
    if (!atual || !(await conferirSenha(String(d.senha_atual || ""), atual))) {
      req.senhaFalhou();
      throw new ErroApi("A senha atual está incorreta.", 401);
    }
    req.senhaOk();
    hash = await gerarHash(String(d.nova_senha));
  }
  await Cliente.atualizar(req.clienteId, limpar(d), hash);
  const cliente = await Cliente.buscar(req.clienteId);
  res.json(hash ? { ...cliente, token: gerarToken(req.clienteId, "cliente", await Cliente.versaoDe(req.clienteId)) } : cliente);
}

async function salvarEndereco(req, res) {
  const e = (req.body || {}).endereco || req.body || {};
  const rua = String(e.rua || "").trim();
  const numero = String(e.numero || "").trim();
  if (!rua || !numero) throw new ErroApi("Informe rua e número.");
  const local = await localizar(e.cep);
  await Cliente.salvarEndereco(
    pool,
    req.clienteId,
    { cep: local.cep, rua, numero, complemento: String(e.complemento || "").trim() },
    local.bairro.id
  );
  res.json(await Cliente.buscar(req.clienteId));
}

async function apagarEndereco(req, res) {
  await Cliente.removerEndereco(req.clienteId);
  res.json(await Cliente.buscar(req.clienteId));
}

async function remover(req, res) {
  const atual = await Cliente.senhaHash(req.clienteId);
  if (!atual || !(await conferirSenha(String((req.body || {}).senha || ""), atual))) {
    req.senhaFalhou();
    throw new ErroApi("Senha incorreta.", 401);
  }
  req.senhaOk();
  await Cliente.remover(req.clienteId);
  res.json({ ok: true });
}

module.exports = { cadastro, login, esqueci, redefinir, perfil, atualizar, salvarEndereco, apagarEndereco, remover };
