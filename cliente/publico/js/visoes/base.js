window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.base = (function () {
  const { criar, achar, aviso, moeda } = Dom;

  const PAGINAS = [
    { id: "home", href: "#/home", rotulo: "Início", icone: "🏠" },
    { id: "montar", href: "#/montar", rotulo: "Montar Marmita", curto: "Montar", icone: "🍱" },
    { id: "pedidos", href: "#/pedidos", rotulo: "Meus Pedidos", curto: "Pedidos", icone: "📋" },
  ];

  function marca() {
    return criar(
      "a",
      { href: "#/home", class: "marca" },
      criar("span", { class: "marca-icone", text: "S" }),
      criar("span", {}, "Sabor Caseiro", criar("small", { text: "Marmitas de Verdade" }))
    );
  }

  function barra(d) {
    let alvo = achar("#barra");
    if (!alvo) {
      alvo = criar("nav", { id: "barra", "aria-label": "Navegação principal" });
      document.body.append(alvo);
    }
    const itens = [
      ...PAGINAS,
      { id: "carrinho", href: "#/carrinho", rotulo: "Carrinho", icone: "🛒", contador: d.qtd },
      d.logado
        ? { id: "conta", href: "#/conta", rotulo: "Conta", icone: "👤" }
        : { id: "conta", href: "#/login?next=" + d.pagina, rotulo: "Entrar", icone: "👤" },
    ];
    alvo.replaceChildren(
      ...itens.map((i) =>
        criar(
          "a",
          { href: i.href, class: "barra-item" + (i.id === d.ativa ? " ativo" : "") },
          criar("span", { class: "barra-icone", "aria-hidden": "true", text: i.icone }),
          criar("span", { text: i.curto || i.rotulo }),
          i.contador ? criar("span", { class: "barra-contador", text: i.contador }) : null
        )
      )
    );
    document.body.classList.add("com-barra");
  }

  function cabecalho(d) {
    const alvo = achar("#cabecalho");
    if (!alvo) return;
    alvo.className = "cabecalho";
    if (d.simples) {
      alvo.replaceChildren(criar("div", { class: "conteudo" }, marca()));
      const antiga = achar("#barra");
      if (antiga) antiga.remove();
      document.body.classList.remove("com-barra");
      return;
    }
    const acoes = criar(
      "div",
      { class: "acoes" },
      d.logado && d.nome
        ? criar(
            "a",
            { href: "#/conta", class: "usuario" },
            criar("span", { class: "inicial", text: d.nome[0].toUpperCase() }),
            criar("span", { class: "nome-usuario", text: "Olá, " + d.nome + "!" })
          )
        : null,
      criar(
        "a",
        { href: "#/carrinho", class: "link-carrinho" },
        criar("span", { class: "texto-carrinho", text: "Meu Carrinho" }),
        criar("span", { class: "icone-carrinho", "aria-hidden": "true", text: "🛒" }),
        criar("span", { class: "contador", text: d.qtd, hidden: d.qtd === 0 })
      ),
      d.logado
        ? criar("a", { href: "#", class: "link-sair", onclick: d.aoSair, text: "Sair" })
        : criar("a", { href: "#/login?next=" + d.pagina, class: "link-sair", text: "Entrar" })
    );
    alvo.replaceChildren(
      criar(
        "div",
        { class: "conteudo" },
        marca(),
        criar(
          "nav",
          { class: "menu" },
          PAGINAS.map((p) => criar("a", { href: p.href, class: p.id === d.ativa ? "ativo" : "", text: p.rotulo }))
        ),
        acoes
      )
    );
    barra(d);
  }

  function rodape(dados) {
    const alvo = achar("#rodape");
    if (!alvo) return;
    alvo.className = "rodape";
    if (!dados) {
      alvo.replaceChildren(criar("strong", { text: "Restaurante Sabor Caseiro" }));
      return;
    }
    alvo.replaceChildren(
      criar("strong", { text: dados.nome }),
      criar("span", { text: " • " + dados.endereco }),
      criar("br"),
      criar("span", { text: `Telefone: ${dados.telefone} • Horário: ${dados.funcionamento.texto}` })
    );
  }

  function mascaraTelefone(campo) {
    campo.addEventListener("input", () => {
      const d = campo.value.replace(/\D/g, "").slice(0, 11);
      campo.value =
        d.length > 10
          ? d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
          : d.length > 6
            ? d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3")
            : d.length > 2
              ? d.replace(/(\d{2})(\d{0,5})/, "($1) $2")
              : d;
    });
  }

  function desenhar(raiz, molde) {
    const modelo = document.createElement("template");
    modelo.innerHTML = molde;
    raiz.replaceChildren(modelo.content);
    raiz.querySelectorAll("input[type=tel]").forEach(mascaraTelefone);
  }

  function mostrarErro(alvo, mensagem) {
    if (!alvo) return aviso(mensagem, "erro");
    alvo.textContent = mensagem || "";
    alvo.hidden = !mensagem;
  }

  function travarBotao(form, travado, textoOcupado) {
    const botao = achar("button[type=submit]", form);
    if (travado) {
      botao.dataset.texto = botao.textContent;
      botao.textContent = textoOcupado;
    } else if (botao.dataset.texto) {
      botao.textContent = botao.dataset.texto;
    }
    botao.disabled = travado;
  }

  function manterDestino(raiz, id, pagina, params) {
    const link = achar(id, raiz);
    if (link && params.has("next")) link.href = pagina + "?next=" + encodeURIComponent(params.get("next"));
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

  function linha(rotulo, valor, classe = "") {
    return criar("div", { class: "linha-resumo " + classe }, criar("span", { text: rotulo }), criar("span", { text: valor }));
  }

  function dicaCep(dica, texto, ruim) {
    dica.textContent = texto;
    dica.classList.toggle("ruim", !!ruim);
  }

  function bairroAchado(caixa, bairro) {
    caixa.classList.toggle("ok", !!bairro);
    caixa.replaceChildren(
      ...(bairro
        ? [
            criar("span", { text: "Bairro: " }),
            criar("strong", { text: bairro.nome }),
            criar("span", { text: ` — taxa de entrega ${moeda(bairro.taxa_entrega)}` }),
          ]
        : ["Informe o CEP para ver o bairro e a taxa de entrega."])
    );
  }

  return {
    cabecalho,
    rodape,
    desenhar,
    mostrarErro,
    travarBotao,
    manterDestino,
    mascaraTelefone,
    semCardapio,
    linha,
    dicaCep,
    bairroAchado,
  };
})();
