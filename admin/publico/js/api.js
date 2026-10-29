window.Adm = window.Adm || {};

Adm.ErroApi = class ErroApi extends Error {
  constructor(mensagem, status, dados = null) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
};

Adm.sessao = {
  token() { try { return localStorage.getItem("adm.token"); } catch { return null; } },
  gerente() { try { return JSON.parse(localStorage.getItem("adm.gerente")); } catch { return null; } },
  entrar(token, gerente) {
    try {
      localStorage.setItem("adm.token", token);
      localStorage.setItem("adm.gerente", JSON.stringify(gerente));
    } catch {}
  },
  sair() {
    try {
      localStorage.removeItem("adm.token");
      localStorage.removeItem("adm.gerente");
    } catch {}
  },
};

Adm.api = (function () {
  async function chamar(caminho, metodo = "GET", corpo) {
    const token = Adm.sessao.token();
    let resp;
    try {
      resp = await fetch(window.ADM_CONFIG.API + caminho, {
        method: metodo,
        headers: {
          ...(corpo !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: "Bearer " + token } : {}),
        },
        body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      });
    } catch {
      throw new Adm.ErroApi("Não foi possível conectar à API.", 0);
    }
    let dados = null;
    try { dados = await resp.json(); } catch {}
    if (!resp.ok) {
      if (resp.status === 401 && token) {
        Adm.sessao.sair();
        location.href = "login.html";
      }
      throw new Adm.ErroApi((dados && dados.erro) || "Erro inesperado (" + resp.status + ").", resp.status, dados);
    }
    return dados;
  }

  const crud = (base) => ({
    listar: () => chamar(base),
    criar: (d) => chamar(base, "POST", d),
    salvar: (id, d) => chamar(base + "/" + encodeURIComponent(id), "PUT", d),
    remover: (id, forcar = false) => chamar(base + "/" + encodeURIComponent(id) + (forcar ? "?forcar=1" : ""), "DELETE"),
  });

  return {
    login: (email, senha) => chamar("/login", "POST", { email, senha }),
    pedidos: (status, limite = 50) => chamar("/pedidos?limite=" + limite + (status ? "&status=" + encodeURIComponent(status) : "")),
    contagem: () => chamar("/pedidos/contagem"),
    metricas: (periodo) => chamar("/metricas?periodo=" + encodeURIComponent(periodo)),
    loja: { ver: () => chamar("/loja"), salvar: (dados) => chamar("/loja", "PUT", dados) },
    tempoReal: (aoEvento) => Dom.tempoReal(() => ({ url: window.ADM_CONFIG.API + "/eventos", token: Adm.sessao.token() }), aoEvento),
    pedido: (id) => chamar("/pedidos/" + id),
    aceitar: (id) => chamar("/pedidos/" + id + "/aceitar", "POST", {}),
    recusar: (id, corpo) => chamar("/pedidos/" + id + "/recusar", "POST", corpo),
    mudarStatus: (id, status) => chamar("/pedidos/" + id + "/status", "PUT", { status }),
    mensagens: (id) => chamar("/pedidos/" + id + "/mensagens"),
    enviarMensagem: (id, texto) => chamar("/pedidos/" + id + "/mensagens", "POST", { texto }),
    produtos: crud("/produtos"),
    tipos: crud("/tipos"),
    bairros: crud("/bairros"),
    cupons: crud("/cupons"),
    recusas: crud("/recusas"),
    cardapioDia: {
      hoje: () => chamar("/cardapio-dia/hoje"),
      ver: (data) => chamar("/cardapio-dia/" + data),
      salvar: (data, corpo) => chamar("/cardapio-dia/" + data, "PUT", corpo),
      publicar: (data, publicado) => chamar("/cardapio-dia/" + data + "/publicar", "POST", { publicado }),
    },
  };
})();
