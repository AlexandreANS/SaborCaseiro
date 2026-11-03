const JANELA = 15 * 60 * 1000;
const MAX_CONTA = Number(process.env.LOGIN_MAX || 8);
const MAX_IP = MAX_CONTA * 5;

function contador(janela = JANELA) {
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
        e = { n: 0, ate: t + janela };
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
    const email = String((req.body && req.body.email) || "")
      .trim()
      .toLowerCase();
    const chaveConta = `${req.ip}|${email}`;
    const conta = contas.pegar(chaveConta);
    const ip = ips.pegar(req.ip);
    if (conta.n >= MAX_CONTA || ip.n >= MAX_IP) {
      const min = Math.ceil((Math.max(conta.ate, ip.ate) - Date.now()) / 60000);
      return res.status(429).json({ erro: `Muitas tentativas de login. Tente de novo em ${min} min.` });
    }
    req.loginFalhou = () => {
      conta.n += 1;
      ip.n += 1;
    };
    req.loginOk = () => contas.apagar(chaveConta);
    prox();
  };
}

function limitar({ max, janela = JANELA, chave, erro }) {
  const mapa = contador(janela);
  return (req, res, prox) => {
    const e = mapa.pegar(chave(req));
    if (e.n >= max) {
      const min = Math.max(1, Math.ceil((e.ate - Date.now()) / 60000));
      return res.status(429).json({ erro: `${erro} Tente de novo em ${min} min.` });
    }
    e.n += 1;
    prox();
  };
}

function limitarSenha(valeParaRequisicao) {
  const mapa = contador();
  const max = Number(process.env.SENHA_MAX || 5);
  return (req, res, prox) => {
    if (!valeParaRequisicao(req)) return prox();
    const chave = "c" + req.clienteId;
    const e = mapa.pegar(chave);
    if (e.n >= max) {
      const min = Math.max(1, Math.ceil((e.ate - Date.now()) / 60000));
      return res.status(429).json({ erro: `Muitas tentativas com a senha atual. Tente de novo em ${min} min.` });
    }
    req.senhaFalhou = () => {
      e.n += 1;
    };
    req.senhaOk = () => mapa.apagar(chave);
    prox();
  };
}

const limitarCep = () => limitar({ max: Number(process.env.CEP_MAX || 120), chave: (req) => req.ip, erro: "Muitas consultas de CEP." });
const limitarCadastro = () =>
  limitar({
    max: Number(process.env.CADASTRO_MAX || 10),
    janela: 60 * 60 * 1000,
    chave: (req) => req.ip,
    erro: "Muitos cadastros deste endereço.",
  });
const limitarPedido = () =>
  limitar({ max: Number(process.env.PEDIDO_MAX || 30), chave: (req) => "c" + req.clienteId, erro: "Muitos pedidos em pouco tempo." });
const limitarMensagem = () =>
  limitar({ max: Number(process.env.MENSAGEM_MAX || 60), chave: (req) => "c" + req.clienteId, erro: "Muitas mensagens em pouco tempo." });

module.exports = { limitarSenha, limitarLogin, limitarCep, limitarCadastro, limitarPedido, limitarMensagem };
