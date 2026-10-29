const crypto = require("crypto");

const SEGREDO = process.env.SABOR_SECRET || "troque-este-segredo-em-producao";
if (!process.env.SABOR_SECRET) {
  console.warn("[aviso] SABOR_SECRET não definido: usando segredo de desenvolvimento.");
}
const VALIDADE = 1000 * 60 * 60 * 24 * 30;

function derivar(senha, sal) {
  return new Promise((ok, falha) =>
    crypto.scrypt(senha, sal, 64, (erro, chave) => (erro ? falha(erro) : ok(chave)))
  );
}

async function gerarHash(senha) {
  const sal = crypto.randomBytes(16).toString("hex");
  const chave = await derivar(senha, sal);
  return `${sal}:${chave.toString("hex")}`;
}

async function conferirSenha(senha, guardado) {
  const [sal, hash] = String(guardado).split(":");
  if (!sal || !hash) return false;
  const calculado = await derivar(senha, sal);
  const esperado = Buffer.from(hash, "hex");
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

function assinar(texto) {
  return crypto.createHmac("sha256", SEGREDO).update(texto).digest("base64url");
}

function gerarToken(id, papel = "cliente") {
  const corpo = Buffer.from(JSON.stringify({ sub: id, papel, exp: Date.now() + VALIDADE })).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
}

function lerToken(token) {
  const [corpo, assinatura] = String(token || "").split(".");
  if (!corpo || !assinatura) return null;
  const a = Buffer.from(assinatura);
  const b = Buffer.from(assinar(corpo));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString());
    return dados.exp > Date.now() ? dados : null;
  } catch {
    return null;
  }
}

function lerSessao(req, res, prox) {
  const cab = req.headers.authorization || "";
  const dados = cab.startsWith("Bearer ") ? lerToken(cab.slice(7)) : null;
  req.clienteId = dados && dados.papel === "cliente" ? dados.sub : null;
  req.gerenteId = dados && dados.papel === "gerente" ? dados.sub : null;
  prox();
}

function exigirLogin(req, res, prox) {
  if (!req.clienteId) return res.status(401).json({ erro: "Faça login para continuar." });
  prox();
}

function exigirGerente(req, res, prox) {
  if (!req.gerenteId) return res.status(401).json({ erro: "Acesso restrito ao gerente." });
  prox();
}

module.exports = { gerarHash, conferirSenha, gerarToken, lerSessao, exigirLogin, exigirGerente };
