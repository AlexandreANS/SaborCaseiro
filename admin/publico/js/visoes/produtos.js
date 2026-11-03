window.Adm = window.Adm || {};
Adm.visao = Adm.visao || {};

Adm.visao.produtos = (function () {
  const { criar, montar, moeda } = Dom;
  const { CATEGORIAS, selo, cabecalhoTabela } = Adm.visao.base;
  const NOME_CAT = Object.fromEntries(CATEGORIAS);

  function casca(raiz) {
    const form = criar("form", { class: "painel", id: "form-produto" });
    const lista = criar("div", { class: "painel" });
    montar(raiz, criar("div", { class: "duas-colunas inverso" }, lista, form));
    return { form, lista };
  }

  function formulario(form, edicao, acoes) {
    const p = edicao || { nome: "", categoria: "carboidrato", preco_extra: 0, ativo: true };
    montar(
      form,
      criar("div", { class: "painel-topo" }, criar("h2", { text: edicao ? "Editar produto" : "Novo produto" })),
      criar(
        "div",
        { class: "campo" },
        criar("label", { for: "p-nome", text: "Nome" }),
        criar("input", { id: "p-nome", name: "nome", value: p.nome, maxlength: "80", required: true })
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { for: "p-cat", text: "Categoria" }),
        criar(
          "select",
          { id: "p-cat", name: "categoria" },
          CATEGORIAS.map(([id, nome]) => criar("option", { value: id, text: nome, selected: id === p.categoria }))
        )
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { for: "p-preco", text: "Preço (R$)" }),
        criar("input", { id: "p-preco", name: "preco_extra", type: "number", min: "0", step: "0.01", value: p.preco_extra }),
        criar("small", {
          class: "suave",
          text: "Em Extras é o preço de venda. Nas demais categorias é o valor cobrado quando o cliente pede o produto como adicional (como opção incluída no tipo, não custa nada).",
        })
      ),
      criar(
        "label",
        { class: "check" },
        criar("input", { type: "checkbox", name: "ativo", checked: p.ativo }),
        criar("span", { text: "Ativo" })
      ),
      criar(
        "div",
        { class: "botoes espaco-cima" },
        criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar alterações" : "Cadastrar" }),
        edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: acoes.cancelar }) : null
      )
    );
  }

  function lista(alvo, produtos, acoes) {
    const busca = criar("input", { type: "text", class: "busca", placeholder: "Buscar produto...", "aria-label": "Buscar" });
    const corpo = criar("tbody");
    function linhas(termo = "") {
      montar(
        corpo,
        produtos
          .filter((p) => p.nome.toLowerCase().includes(termo.toLowerCase()))
          .map((p) =>
            criar(
              "tr",
              {},
              criar("td", { text: p.nome }),
              criar("td", { text: NOME_CAT[p.categoria] }),
              criar("td", { text: p.preco_extra > 0 ? (p.categoria === "extra" ? "" : "+ ") + moeda(p.preco_extra) : "—" }),
              criar("td", {}, selo(p.ativo)),
              criar(
                "td",
                { class: "acoes-linha" },
                criar("button", { class: "botao botao-contorno botao-p", text: "Editar", onclick: () => acoes.editar(p) }),
                criar("button", { class: "botao botao-perigo botao-p", text: "Excluir", onclick: () => acoes.excluir(p) })
              )
            )
          )
      );
    }
    busca.addEventListener("input", () => linhas(busca.value));
    montar(
      alvo,
      criar("div", { class: "painel-topo" }, criar("h2", { text: `Produtos (${produtos.length})` }), busca),
      criar("table", { class: "tabela" }, cabecalhoTabela(["Nome", "Categoria", "Preço", "Situação", ""]), corpo)
    );
    linhas();
  }

  return { casca, formulario, lista };
})();
