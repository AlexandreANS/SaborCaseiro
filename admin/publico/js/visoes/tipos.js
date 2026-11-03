window.Adm = window.Adm || {};
Adm.visao = Adm.visao || {};

Adm.visao.tipos = (function () {
  const { criar, achar, montar, moeda } = Dom;
  const { CATEGORIAS_MARMITA: CATEGORIAS, caixas, selo, cabecalhoTabela } = Adm.visao.base;

  function casca(raiz) {
    const form = criar("form", { class: "painel", id: "form-tipo" });
    const lista = criar("div", { class: "painel" });
    montar(raiz, criar("div", { class: "duas-colunas inverso" }, lista, form));
    return { form, lista };
  }

  function formulario(form, edicao, produtos, acoes) {
    const t = edicao || { nome: "", descricao: "", preco: "", ativo: true, categorias: [], produto_ids: [] };
    const regras = Object.fromEntries(t.categorias.map((c) => [c.categoria, c]));
    const linhasCat = CATEGORIAS.map(([id, nome]) => {
      const r = regras[id];
      return criar(
        "div",
        { class: "linha-categoria", "data-cat": id },
        criar(
          "label",
          { class: "check" },
          criar("input", { type: "checkbox", name: "usa-" + id, checked: !!r }),
          criar("span", { text: nome })
        ),
        criar("input", {
          type: "number",
          name: "min-" + id,
          min: "0",
          max: "20",
          value: r ? r.minimo : 1,
          "aria-label": "Mínimo de " + nome,
        }),
        criar("input", {
          type: "number",
          name: "max-" + id,
          min: "0",
          max: "20",
          value: r ? r.maximo : 1,
          "aria-label": "Máximo de " + nome,
        })
      );
    });

    montar(
      form,
      criar("div", { class: "painel-topo" }, criar("h2", { text: edicao ? "Editar tipo" : "Novo tipo" })),
      criar(
        "div",
        { class: "linha-campos" },
        criar(
          "div",
          { class: "campo" },
          criar("label", { for: "t-nome", text: "Nome" }),
          criar("input", { id: "t-nome", name: "nome", value: t.nome, maxlength: "80", required: true })
        ),
        criar(
          "div",
          { class: "campo" },
          criar("label", { for: "t-preco", text: "Preço (R$)" }),
          criar("input", { id: "t-preco", name: "preco", type: "number", min: "0", step: "0.01", value: t.preco, required: true })
        )
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { for: "t-desc", text: "Descrição" }),
        criar("input", { id: "t-desc", name: "descricao", value: t.descricao || "", maxlength: "300" })
      ),
      criar("h3", { text: "Categorias do tipo" }),
      criar("p", {
        class: "suave",
        text: "Mín. é quantas opções já vêm no preço do tipo. Máx. é o total permitido: o que passar do mínimo o cliente paga como adicional, pelo preço do produto.",
      }),
      criar(
        "div",
        { class: "linha-categoria cabecalho" },
        criar("span", { text: "Categoria" }),
        criar("span", { text: "Mín." }),
        criar("span", { text: "Máx." })
      ),
      linhasCat,
      criar("h3", { class: "espaco-cima", text: "Produtos permitidos neste tipo" }),
      criar(
        "div",
        { id: "t-produtos" },
        caixas(
          produtos.filter((p) => p.categoria !== "extra"),
          new Set(t.produto_ids)
        )
      ),
      criar(
        "label",
        { class: "check espaco-cima" },
        criar("input", { type: "checkbox", name: "ativo", checked: t.ativo }),
        criar("span", { text: "Tipo ativo" })
      ),
      criar(
        "div",
        { class: "botoes espaco-cima" },
        criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar alterações" : "Cadastrar tipo" }),
        edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: acoes.cancelar }) : null
      )
    );
  }

  function dadosDoForm(form) {
    const c = form.elements;
    return {
      nome: c.nome.value,
      descricao: c.descricao.value,
      preco: c.preco.value,
      ativo: c.ativo.checked,
      categorias: CATEGORIAS.filter(([id]) => c["usa-" + id].checked).map(([id]) => ({
        categoria: id,
        minimo: Number(c["min-" + id].value),
        maximo: Number(c["max-" + id].value),
      })),
      produto_ids: Adm.visao.base.marcadosDe(achar("#t-produtos")),
    };
  }

  function lista(alvo, tipos, acoes) {
    montar(
      alvo,
      criar("div", { class: "painel-topo" }, criar("h2", { text: `Tipos (${tipos.length})` })),
      criar(
        "table",
        { class: "tabela" },
        cabecalhoTabela(["Tipo", "Preço", "Produtos", "Situação", ""]),
        criar(
          "tbody",
          {},
          tipos.map((t) =>
            criar(
              "tr",
              {},
              criar("td", {}, criar("strong", { text: t.nome }), criar("br"), criar("small", { class: "suave", text: t.descricao || "" })),
              criar("td", { text: moeda(t.preco) }),
              criar("td", { text: t.produto_ids.length }),
              criar("td", {}, selo(t.ativo)),
              criar(
                "td",
                { class: "acoes-linha" },
                criar("button", { class: "botao botao-contorno botao-p", text: "Editar", onclick: () => acoes.editar(t) }),
                criar("button", { class: "botao botao-perigo botao-p", text: "Excluir", onclick: () => acoes.excluir(t) })
              )
            )
          )
        )
      )
    );
  }

  return { casca, formulario, dadosDoForm, lista };
})();
