window.Adm = window.Adm || {};
Adm.visao = Adm.visao || {};

Adm.visao.base = (function () {
  const { criar, achar, montar } = Dom;

  const MENU = [
    { id: "dashboard", href: "dashboard.html", rotulo: "Resumo" },
    { id: "pedidos", href: "pedidos.html", rotulo: "Pedidos" },
    { id: "metricas", href: "metricas.html", rotulo: "Métricas" },
    { id: "cardapio", href: "cardapio.html", rotulo: "Cardápio do Dia" },
    { id: "produtos", href: "produtos.html", rotulo: "Produtos" },
    { id: "tipos", href: "tipos.html", rotulo: "Tipos de Marmita" },
    { id: "configuracoes", href: "configuracoes.html", rotulo: "Configurações" },
  ];

  const FORMAS = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };
  const SELO = {
    Esperando: "selo-aviso",
    Preparando: "selo-aviso",
    "Saiu para Entrega": "selo-neutro",
    "Pronto para Retirada": "selo-neutro",
    Concluído: "selo-ok",
    Cancelado: "selo-perigo",
  };
  const CATEGORIAS = [
    ["carboidrato", "Carboidratos"],
    ["proteina", "Proteínas"],
    ["acompanhamento", "Acompanhamentos"],
    ["salada", "Saladas e Legumes"],
    ["extra", "Extras (bebidas e sobremesas)"],
  ];
  const CATEGORIAS_MARMITA = CATEGORIAS.filter(([id]) => id !== "extra");

  function layout(d) {
    montar(
      achar("#lateral"),
      criar(
        "div",
        { class: "marca" },
        criar("span", { class: "marca-icone", text: "S" }),
        criar("span", {}, "Sabor Caseiro", criar("small", { text: "Painel do Gerente" }))
      ),
      criar(
        "ul",
        { class: "menu" },
        MENU.map((m) => criar("li", {}, criar("a", { href: m.href, class: m.id === d.ativa ? "ativo" : "", text: m.rotulo })))
      ),
      criar(
        "div",
        { class: "lateral-usuario" },
        criar("span", { class: "inicial", text: d.gerente.nome[0].toUpperCase() }),
        criar(
          "div",
          {},
          criar("strong", { text: d.gerente.nome }),
          criar("a", { href: "#", class: "link-sair", onclick: d.aoSair, text: "Sair" })
        )
      )
    );
    montar(
      achar("#topo"),
      criar("div", {}, criar("h1", { text: d.titulo }), criar("span", { class: "data", text: d.subtitulo || "" })),
      d.extra || null
    );
    document.title = d.titulo + " — Sabor Caseiro";
  }

  function caixas(produtos, marcados, aoMudar) {
    return CATEGORIAS.map(([cat, nome]) => {
      const lista = produtos.filter((p) => p.categoria === cat);
      if (!lista.length) return null;
      const entradas = lista.map((p) => ({
        p,
        campo: criar("input", { type: "checkbox", value: p.id, checked: marcados.has(p.id), onchange: aoMudar }),
      }));
      const todos = criar("button", {
        type: "button",
        class: "botao botao-contorno botao-p",
        text: "Marcar todos",
        onclick: () => {
          const alvo = entradas.some((e) => !e.campo.checked);
          entradas.forEach((e) => {
            e.campo.checked = alvo;
          });
          if (aoMudar) aoMudar();
        },
      });
      return criar(
        "div",
        { class: "grupo-checks" },
        criar("div", { class: "grupo-topo" }, criar("h3", { text: nome }), todos),
        criar(
          "div",
          { class: "grade-checks" },
          entradas.map(({ p, campo }) =>
            criar(
              "label",
              { class: "check" + (p.ativo === false ? " inativo" : "") },
              campo,
              criar("span", { text: p.nome + (p.ativo === false ? " (inativo)" : "") })
            )
          )
        )
      );
    });
  }

  function marcadosDe(raiz) {
    return [...raiz.querySelectorAll("input[type=checkbox]:checked")].map((c) => Number(c.value));
  }

  function erro(alvo, mensagem) {
    montar(alvo, criar("p", { class: "msg-erro", text: mensagem }));
  }

  const selo = (ativo) => criar("span", { class: "selo " + (ativo ? "selo-ok" : "selo-neutro"), text: ativo ? "Ativo" : "Inativo" });

  const cabecalhoTabela = (titulos) =>
    criar(
      "thead",
      {},
      criar(
        "tr",
        {},
        titulos.map((t) => criar("th", {}, t === "" ? criar("span", { class: "so-leitor", text: "Ações" }) : t))
      )
    );

  return { layout, caixas, marcadosDe, erro, selo, cabecalhoTabela, FORMAS, SELO, CATEGORIAS, CATEGORIAS_MARMITA };
})();
