window.Adm = window.Adm || {};

Adm.tela = (function () {
  const { moeda, achar, criar, montar, aviso } = Dom;

  async function tentar(acao, ok) {
    try {
      const r = await acao();
      if (ok) aviso(ok);
      return r === undefined ? true : r;
    } catch (erro) {
      aviso(erro.message, "erro");
      return false;
    }
  }

  async function excluir(remover, id, ok) {
    try {
      await remover(id);
      aviso(ok);
      return true;
    } catch (falha) {
      if (!(falha.dados && falha.dados.confirmar)) {
        aviso(falha.message, "erro");
        return false;
      }
      if (!confirm(falha.message + "\n\nExcluir mesmo assim?")) return false;
      return tentar(() => remover(id, true), ok);
    }
  }

  const MENU = [
    { id: "dashboard", href: "dashboard.html", rotulo: "Resumo" },
    { id: "pedidos", href: "pedidos.html", rotulo: "Pedidos" },
    { id: "metricas", href: "metricas.html", rotulo: "Métricas" },
    { id: "cardapio", href: "cardapio.html", rotulo: "Cardápio do Dia" },
    { id: "produtos", href: "produtos.html", rotulo: "Produtos" },
    { id: "tipos", href: "tipos.html", rotulo: "Tipos de Marmita" },
    { id: "configuracoes", href: "configuracoes.html", rotulo: "Configurações" },
  ];

  function sair() {
    Adm.sessao.sair();
    location.href = "login.html";
  }

  function iniciar(ativa, titulo, subtitulo, extra) {
    if (!Adm.sessao.token()) {
      location.replace("login.html");
      return false;
    }
    const gerente = Adm.sessao.gerente() || { nome: "Gerente" };
    montar(achar("#lateral"),
      criar("div", { class: "marca" },
        criar("span", { class: "marca-icone", text: "S" }),
        criar("span", {}, "Sabor Caseiro", criar("small", { text: "Painel do Gerente" }))),
      criar("ul", { class: "menu" }, MENU.map((m) =>
        criar("li", {}, criar("a", { href: m.href, class: m.id === ativa ? "ativo" : "", text: m.rotulo })))),
      criar("div", { class: "lateral-usuario" },
        criar("span", { class: "inicial", text: gerente.nome[0].toUpperCase() }),
        criar("div", {}, criar("strong", { text: gerente.nome }), criar("a", { href: "#", class: "link-sair", onclick: (ev) => { ev.preventDefault(); sair(); }, text: "Sair" }))));
    montar(achar("#topo"),
      criar("div", {}, criar("h2", { text: titulo }), criar("span", { class: "data", text: subtitulo || "" })),
      extra || null);
    document.title = titulo + " — Sabor Caseiro";
    return true;
  }

  const FORMAS = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };
  const SELO = {
    Esperando: "selo-aviso", Preparando: "selo-aviso", "Saiu para Entrega": "selo-neutro",
    "Pronto para Retirada": "selo-neutro", Concluído: "selo-ok", Cancelado: "selo-perigo",
  };
  const CATEGORIAS = [
    ["carboidrato", "Carboidratos"], ["proteina", "Proteínas"], ["acompanhamento", "Acompanhamentos"],
    ["salada", "Saladas e Legumes"], ["extra", "Extras (bebidas e sobremesas)"],
  ];
  const CATEGORIAS_MARMITA = CATEGORIAS.filter(([id]) => id !== "extra");

  function caixas(produtos, marcados, aoMudar) {
    return CATEGORIAS.map(([cat, nome]) => {
      const lista = produtos.filter((p) => p.categoria === cat);
      if (!lista.length) return null;
      const entradas = lista.map((p) => ({ p, campo: criar("input", { type: "checkbox", value: p.id, checked: marcados.has(p.id), onchange: aoMudar }) }));
      const todos = criar("button", {
        type: "button", class: "botao botao-contorno botao-p", text: "Marcar todos",
        onclick: () => {
          const alvo = entradas.some((e) => !e.campo.checked);
          entradas.forEach((e) => { e.campo.checked = alvo; });
          if (aoMudar) aoMudar();
        },
      });
      return criar("div", { class: "grupo-checks" },
        criar("div", { class: "grupo-topo" }, criar("h4", { text: nome }), todos),
        criar("div", { class: "grade-checks" }, entradas.map(({ p, campo }) =>
          criar("label", { class: "check" + (p.ativo === false ? " inativo" : "") }, campo, criar("span", { text: p.nome + (p.ativo === false ? " (inativo)" : "") })))));
    });
  }

  function marcadosDe(raiz) {
    return [...raiz.querySelectorAll("input[type=checkbox]:checked")].map((c) => Number(c.value));
  }

  return { criar, achar, montar, moeda, aviso, tentar, excluir, iniciar, caixas, marcadosDe, FORMAS, SELO, CATEGORIAS, CATEGORIAS_MARMITA };
})();
