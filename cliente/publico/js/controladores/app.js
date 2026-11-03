window.Sabor = window.Sabor || {};

Sabor.app = (function () {
  const { sessao, carrinho } = Sabor;
  const { aviso } = Dom;
  let guardada = null;
  let ativaAtual = null;
  let simplesAtual = false;

  async function loja(fresca = false) {
    if (!fresca && guardada && guardada.ate > Date.now()) return guardada.dados;
    try {
      guardada = { dados: await Sabor.api.loja(), ate: Date.now() + 60000 };
    } catch {
      return guardada ? guardada.dados : null;
    }
    return guardada.dados;
  }

  function paginaAtual() {
    return encodeURIComponent(location.hash.slice(1) || "/home");
  }

  function exigirLogin() {
    if (sessao.logado()) return true;
    Sabor.rota.ir("/login?next=" + paginaAtual(), true);
    return false;
  }

  function destinoSeguro(params, padrao = "/home") {
    const next = params.get("next");
    return next && /^\/[a-z]+(\?[\w=&%.-]*)?$/i.test(next) ? next : padrao;
  }

  function sairDaConta(ev) {
    ev.preventDefault();
    sessao.sair();
    Sabor.rota.ir("/login");
  }

  function desenharCabecalho() {
    const cliente = sessao.cliente();
    Sabor.visao.base.cabecalho({
      ativa: ativaAtual,
      simples: simplesAtual,
      logado: sessao.logado(),
      nome: cliente ? cliente.nome.split(" ")[0] : null,
      qtd: carrinho.total(),
      pagina: paginaAtual(),
      aoSair: sairDaConta,
    });
  }

  function cabecalho(ativa, simples = false) {
    ativaAtual = ativa;
    simplesAtual = simples;
    desenharCabecalho();
  }

  async function repetirPedido(id) {
    try {
      const [rep, cardapio] = await Promise.all([Sabor.api.repetir(id), Sabor.api.cardapio()]);
      let novos = 0;
      for (const i of rep.itens) {
        if (i.extra_id) {
          const extra = cardapio.extras.find((e) => e.id === i.extra_id);
          if (!extra) continue;
          carrinho.definirExtra(extra, carrinho.quantidadeExtra(extra.id) + i.quantidade);
          novos += 1;
          continue;
        }
        const tipo = cardapio.tipos.find((t) => t.id === i.tipo_id);
        if (!tipo) continue;
        const todas = tipo.categorias.flatMap((c) => c.opcoes);
        const nomes = todas.filter((o) => i.ingredientes.includes(o.id)).map((o) => o.nome);
        const extras = (i.adicionais || []).map((x) => todas.find((o) => o.id === x)?.nome).filter(Boolean);
        carrinho.adicionar({
          tipo_id: tipo.id,
          ingredientes: i.ingredientes,
          adicionais: i.adicionais || [],
          quantidade: i.quantidade,
          observacoes: i.observacoes || null,
          titulo: tipo.nome,
          descricao: nomes.join(", ") + (extras.length ? " · Extras: " + extras.join(", ") : ""),
        });
        novos += 1;
      }
      if (rep.indisponiveis.length) aviso("Fora do cardápio de hoje: " + rep.indisponiveis.join(", ") + ".", "erro");
      if (!novos) return aviso("Nenhum item deste pedido está disponível hoje.", "erro");
      Sabor.rota.ir("/carrinho");
    } catch (falha) {
      aviso(falha.message, "erro");
    }
  }

  async function iniciar() {
    Sabor.visao.base.rodape(null);
    document.addEventListener("sabor:mudou", desenharCabecalho);
    window.addEventListener("storage", desenharCabecalho);
    Sabor.visao.base.rodape(await loja());
  }

  return { loja, exigirLogin, destinoSeguro, cabecalho, repetirPedido, iniciar };
})();
