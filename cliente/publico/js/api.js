window.Sabor = window.Sabor || {};

Sabor.ErroApi = class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.name = "ErroApi";
    this.status = status;
  }
};

Sabor.api = (function () {
  const LIMITE_MS = 15000;

  async function chamar(caminho, { metodo = "GET", corpo } = {}) {
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), LIMITE_MS);
    const token = Sabor.dados.sessao.token();
    let resp;
    try {
      resp = await fetch(window.SABOR_CONFIG.API + caminho, {
        method: metodo,
        headers: {
          ...(corpo ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: corpo ? JSON.stringify(corpo) : undefined,
        signal: controle.signal,
      });
    } catch {
      throw new Sabor.ErroApi("Não foi possível conectar ao servidor. Verifique sua internet e tente de novo.", 0);
    } finally {
      clearTimeout(relogio);
    }

    let dados = null;
    try { dados = await resp.json(); } catch {}

    if (!resp.ok) {
      if (resp.status === 401 && token) Sabor.dados.sessao.sair();
      throw new Sabor.ErroApi((dados && dados.erro) || "Erro inesperado (" + resp.status + ").", resp.status);
    }
    return dados;
  }

  function tempoReal(caminho, aoEvento) {
    return Dom.tempoReal(() => ({ url: window.SABOR_CONFIG.API + caminho, token: Sabor.dados.sessao.token() }), aoEvento);
  }

  return {
    login: (email, senha) => chamar("/acesso/login", { metodo: "POST", corpo: { email, senha } }),
    cadastrar: (dados) => chamar("/acesso/cadastro", { metodo: "POST", corpo: dados }),
    eu: () => chamar("/acesso/eu"),
    cardapio: () => chamar("/cardapio"),
    loja: () => chamar("/loja"),
    esqueci: (email) => chamar("/acesso/esqueci", { metodo: "POST", corpo: { email } }),
    redefinir: (token, senha) => chamar("/acesso/redefinir", { metodo: "POST", corpo: { token, senha } }),
    cancelarPedido: (id) => chamar("/pedidos/" + encodeURIComponent(id) + "/cancelar", { metodo: "POST", corpo: {} }),
    tempoReal,
    repetir: (id) => chamar("/pedidos/" + encodeURIComponent(id) + "/repetir"),
    cotar: (itens, opcoes = {}) => chamar("/carrinho/cotacao", { metodo: "POST", corpo: { itens, ...opcoes } }),
    criarPedido: (pedido) => chamar("/pedidos", { metodo: "POST", corpo: pedido }),
    pedido: (id) => chamar("/pedidos/" + encodeURIComponent(id)),
    pedidos: (limite = 20) => chamar("/pedidos?limite=" + limite),
    mensagens: (id) => chamar("/pedidos/" + encodeURIComponent(id) + "/mensagens"),
    enviarMensagem: (id, texto) => chamar("/pedidos/" + encodeURIComponent(id) + "/mensagens", { metodo: "POST", corpo: { texto } }),
    editarConta: (dados) => chamar("/acesso/eu", { metodo: "PUT", corpo: dados }),
    excluirConta: (senha) => chamar("/acesso/eu", { metodo: "DELETE", corpo: { senha } }),
  };
})();
