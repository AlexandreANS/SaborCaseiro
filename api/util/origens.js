const { emProducao } = require("./producao");

const normalizar = (url) => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

function origensConfiguradas() {
  const lista = String(process.env.SABOR_ORIGENS || "")
    .split(",")
    .map((o) => normalizar(o.trim()))
    .filter(Boolean);
  const cliente = process.env.SABOR_URL_CLIENTE ? normalizar(process.env.SABOR_URL_CLIENTE) : null;
  return new Set(cliente ? [...lista, cliente] : lista);
}

function origemPermitida(origem, hostDaApi, configuradas = origensConfiguradas()) {
  if (!origem) return true;
  const alvo = normalizar(origem);
  if (!alvo) return false;
  if (configuradas.has(alvo)) return true;
  const host = new URL(alvo).hostname;
  if (host === "localhost" || host === "127.0.0.1") return true;
  return !emProducao() && host === hostDaApi;
}

function opcoesCors(req, resposta) {
  const permitida = origemPermitida(req.headers.origin, req.hostname);
  resposta(null, { origin: permitida ? true : false, maxAge: 600 });
}

module.exports = { opcoesCors, origemPermitida, origensConfiguradas };
