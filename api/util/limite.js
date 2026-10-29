const JANELA = 15 * 60 * 1000;
const MAX_CONTA = Number(process.env.LOGIN_MAX || 8);
const MAX_IP = MAX_CONTA * 5;

function contador() {
  const mapa = new Map();
  setInterval(() => {
    const t = Date.now();
    for (const [chave, e] of mapa) if (e.ate < t) mapa.delete(chave);
  }, 60 * 1000).unref();
  return {
    pegar(chave) {
      const t = Date.now();
      let e = mapa.get(chave);
      if (!e || e.ate < t) {
        e = { n: 0, ate: t + JANELA };
        mapa.set(chave, e);
      }
      return e;
    },
    apagar: (chave) => mapa.delete(chave),
  };
}

function limitarLogin() {
  const contas = contador();
  const ips = contador();
  return (req, res, prox) => {
    const email = String((req.body && req.body.email) || "").trim().toLowerCase();
    const chaveConta = `${req.ip}|${email}`;
    const conta = contas.pegar(chaveConta);
    const ip = ips.pegar(req.ip);
    if (conta.n >= MAX_CONTA || ip.n >= MAX_IP) {
      const min = Math.ceil((Math.max(conta.ate, ip.ate) - Date.now()) / 60000);
      return res.status(429).json({ erro: `Muitas tentativas de login. Tente de novo em ${min} min.` });
    }
    req.loginFalhou = () => { conta.n += 1; ip.n += 1; };
    req.loginOk = () => contas.apagar(chaveConta);
    prox();
  };
}

module.exports = { limitarLogin };
