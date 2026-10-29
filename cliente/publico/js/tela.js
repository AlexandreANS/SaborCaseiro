window.Sabor = window.Sabor || {};

Sabor.tela = (function () {
  const { sessao, carrinho } = Sabor.dados;
  const { moeda, achar, criar, montar, aviso } = Dom;

  function mostrarErro(alvo, mensagem) {
    if (!alvo) return aviso(mensagem, "erro");
    alvo.textContent = mensagem || "";
    alvo.hidden = !mensagem;
  }

  const PAGINAS = [
    { id: "home", href: "#/home", rotulo: "Início", icone: "🏠" },
    { id: "montar", href: "#/montar", rotulo: "Montar Marmita", curto: "Montar", icone: "🍱" },
    { id: "pedidos", href: "#/pedidos", rotulo: "Meus Pedidos", curto: "Pedidos", icone: "📋" },
  ];

  let ativaAtual = null;
  let simplesAtual = false;

  function paginaAtual() {
    return encodeURIComponent(location.hash.slice(1) || "/home");
  }

  function sairDaConta(ev) {
    ev.preventDefault();
    sessao.sair();
    Sabor.rota.ir("/login");
  }

  function desenharMarca() {
    return criar("a", { href: "#/home", class: "marca" },
      criar("span", { class: "marca-icone", text: "S" }),
      criar("span", {}, "Sabor Caseiro", criar("small", { text: "Marmitas de Verdade" })));
  }

  function desenharCabecalho(ativa) {
    const alvo = achar("#cabecalho");
    if (!alvo) return;
    if (simplesAtual) {
      alvo.className = "cabecalho";
      alvo.replaceChildren(criar("div", { class: "conteudo" }, desenharMarca()));
      const barra = achar("#barra");
      if (barra) barra.remove();
      document.body.classList.remove("com-barra");
      return;
    }
    const cliente = sessao.cliente();
    const nome = cliente ? cliente.nome.split(" ")[0] : null;
    const qtd = carrinho.total();

    const acoes = criar("div", { class: "acoes" },
      sessao.logado() && nome
        ? criar("a", { href: "#/conta", class: "usuario" }, criar("span", { class: "inicial", text: nome[0].toUpperCase() }), criar("span", { class: "nome-usuario", text: "Olá, " + nome + "!" }))
        : null,
      criar("a", { href: "#/carrinho", class: "link-carrinho" },
        criar("span", { class: "texto-carrinho", text: "Meu Carrinho" }),
        criar("span", { class: "icone-carrinho", "aria-hidden": "true", text: "🛒" }),
        criar("span", { class: "contador", text: qtd, hidden: qtd === 0 })),
      sessao.logado()
        ? criar("a", { href: "#", class: "link-sair", onclick: sairDaConta, text: "Sair" })
        : criar("a", { href: "#/login?next=" + paginaAtual(), class: "link-sair", text: "Entrar" }));

    alvo.className = "cabecalho";
    alvo.replaceChildren(criar("div", { class: "conteudo" },
      desenharMarca(),
      criar("nav", { class: "menu" },
        PAGINAS.map((p) => criar("a", { href: p.href, class: p.id === ativa ? "ativo" : "", text: p.rotulo }))),
      acoes));

    desenharBarra(ativa, qtd);
  }

  function desenharBarra(ativa, qtd) {
    let barra = achar("#barra");
    if (!barra) {
      barra = criar("nav", { id: "barra", "aria-label": "Navegação principal" });
      document.body.append(barra);
    }
    const itens = [
      ...PAGINAS,
      { id: "carrinho", href: "#/carrinho", rotulo: "Carrinho", icone: "🛒", contador: qtd },
      sessao.logado()
        ? { id: "conta", href: "#/conta", rotulo: "Conta", icone: "👤" }
        : { id: "conta", href: "#/login?next=" + paginaAtual(), rotulo: "Entrar", icone: "👤" },
    ];
    barra.replaceChildren(...itens.map((i) =>
      criar("a", { href: i.href, class: "barra-item" + (i.id === ativa ? " ativo" : "") },
        criar("span", { class: "barra-icone", "aria-hidden": "true", text: i.icone }),
        criar("span", { text: i.curto || i.rotulo }),
        i.contador ? criar("span", { class: "barra-contador", text: i.contador }) : null)));
    document.body.classList.add("com-barra");
  }

  let guardada = null;

  async function loja(fresca = false) {
    if (!fresca && guardada && guardada.ate > Date.now()) return guardada.dados;
    try {
      guardada = { dados: await Sabor.api.loja(), ate: Date.now() + 60000 };
    } catch {
      return guardada ? guardada.dados : null;
    }
    return guardada.dados;
  }

  async function funcionamento(fresca = false) {
    const dados = await loja(fresca);
    return dados ? dados.funcionamento : null;
  }

  function dataCurta(iso) {
    const [a, m, d] = iso.split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  }

  function semCardapio(cardapio) {
    return cardapio.proximo
      ? "O cardápio de hoje ainda não foi publicado. O próximo cardápio é de " + dataCurta(cardapio.proximo) + "."
      : "O cardápio de hoje ainda não foi publicado. Volte mais tarde!";
  }

  async function repetirPedido(id) {
    const { carrinho } = Sabor.dados;
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
        const nomes = tipo.categorias.flatMap((c) => c.opcoes).filter((o) => i.ingredientes.includes(o.id)).map((o) => o.nome);
        carrinho.adicionar({
          tipo_id: tipo.id, ingredientes: i.ingredientes, quantidade: i.quantidade,
          observacoes: i.observacoes || null, titulo: tipo.nome, descricao: nomes.join(", "),
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

  async function desenharRodape() {
    const alvo = achar("#rodape");
    if (!alvo) return;
    alvo.className = "rodape";
    const nome = criar("strong", { text: "Restaurante Sabor Caseiro" });
    const endereco = criar("span");
    const contato = criar("span");
    alvo.replaceChildren(nome, endereco, criar("br"), contato);
    const dados = await loja();
    if (!dados) return;
    nome.textContent = dados.nome;
    endereco.textContent = " • " + dados.endereco;
    contato.textContent = `Telefone: ${dados.telefone} • Horário: ${dados.funcionamento.texto}`;
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

  function mascaraTelefone(campo) {
    campo.addEventListener("input", () => {
      const d = campo.value.replace(/\D/g, "").slice(0, 11);
      campo.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
        : d.length > 6 ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
        : d.length > 2 ? d.replace(/(\d{2})(\d{0,5})/, "($1) $2") : d;
    });
  }

  function cabecalho(ativa, simples = false) {
    ativaAtual = ativa;
    simplesAtual = simples;
    desenharCabecalho(ativa);
  }

  function desenhar(raiz, texto) {
    const molde = document.createElement("template");
    molde.innerHTML = texto;
    raiz.replaceChildren(molde.content);
    raiz.querySelectorAll("input[type=tel]").forEach(mascaraTelefone);
  }

  function iniciar() {
    desenharRodape();
    document.addEventListener("sabor:mudou", () => desenharCabecalho(ativaAtual));
    window.addEventListener("storage", () => desenharCabecalho(ativaAtual));
  }

  return { criar, achar, montar, moeda, aviso, mostrarErro, iniciar, cabecalho, desenhar, exigirLogin, destinoSeguro, mascaraTelefone, loja, funcionamento, dataCurta, semCardapio, repetirPedido };
})();
