window.Adm = window.Adm || {};
Adm.visao = Adm.visao || {};

Adm.visao.cardapio = (function () {
  const { criar, montar } = Dom;
  const { caixas } = Adm.visao.base;

  const campoData = () => criar("input", { type: "date", class: "busca", id: "data", "aria-label": "Data do cardápio" });

  function tela(raiz, d, acoes) {
    const tiposAtivos = d.tipos.filter((t) => t.ativo);
    const marcadosTipos = new Set(d.dia.tipo_ids);
    const marcadosProdutos = new Set(d.dia.produto_ids);
    const gradeTipos = criar(
      "div",
      { class: "grade-checks", id: "marcar-tipos" },
      tiposAtivos.map((t) =>
        criar(
          "label",
          { class: "check" },
          criar("input", { type: "checkbox", value: t.id, checked: marcadosTipos.has(t.id) }),
          criar("span", { text: `${t.nome} — R$ ${t.preco.toFixed(2).replace(".", ",")}` })
        )
      )
    );
    const blocoProdutos = criar(
      "div",
      { id: "marcar-produtos" },
      caixas(
        d.produtos.filter((p) => p.ativo),
        marcadosProdutos
      )
    );

    montar(
      raiz,
      criar(
        "div",
        { class: "painel" },
        criar(
          "div",
          { class: "painel-topo" },
          criar("h2", { text: "Situação" }),
          criar("span", {
            class: "selo " + (d.dia.publicado ? "selo-ok" : "selo-perigo"),
            text: d.dia.publicado ? "Publicado" : "Não publicado",
          })
        ),
        criar("p", { text: "Só o que estiver marcado e publicado aparece para os clientes montarem as marmitas." }),
        criar(
          "div",
          { class: "botoes espaco-cima" },
          criar("button", { class: "botao botao-contorno", text: "Salvar seleção", onclick: acoes.salvar }),
          d.dia.publicado ? null : criar("button", { class: "botao botao-leve", text: "Copiar o último cardápio", onclick: acoes.copiar }),
          d.dia.publicado
            ? criar("button", { class: "botao botao-perigo", text: "Despublicar", onclick: () => acoes.publicar(false) })
            : criar("button", { class: "botao botao-principal", text: "Salvar e publicar", onclick: () => acoes.publicar(true) })
        )
      ),
      criar(
        "div",
        { class: "painel" },
        criar("div", { class: "painel-topo" }, criar("h2", { text: "Tipos de marmita do dia" })),
        tiposAtivos.length ? gradeTipos : criar("p", { text: "Cadastre tipos de marmita na tela de Tipos." })
      ),
      criar("div", { class: "painel" }, criar("div", { class: "painel-topo" }, criar("h2", { text: "Produtos do dia" })), blocoProdutos)
    );
  }

  return { campoData, tela };
})();
