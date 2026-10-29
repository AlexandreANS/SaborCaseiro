document.addEventListener("DOMContentLoaded", async () => {
  const { criar, achar, montar, moeda, tentar, iniciar, CATEGORIAS } = Adm.tela;
  if (!iniciar("produtos", "Produtos", "Ingredientes das marmitas e extras (bebidas e sobremesas vendidas à parte no carrinho).")) return;

  const raiz = achar("#conteudo");
  const NOME_CAT = Object.fromEntries(CATEGORIAS);
  let lista = [];
  let edicao = null;

  const form = criar("form", { class: "painel", id: "form-produto" });
  const alvoLista = criar("div", { class: "painel" });
  montar(raiz, criar("div", { class: "duas-colunas inverso" }, alvoLista, form));

  function desenharForm() {
    const p = edicao || { nome: "", categoria: "carboidrato", preco_extra: 0, ativo: true };
    montar(form,
      criar("div", { class: "painel-topo" }, criar("h3", { text: edicao ? "Editar produto" : "Novo produto" })),
      criar("div", { class: "campo" }, criar("label", { for: "p-nome", text: "Nome" }), criar("input", { id: "p-nome", name: "nome", value: p.nome, maxlength: "80", required: true })),
      criar("div", { class: "campo" }, criar("label", { for: "p-cat", text: "Categoria" }),
        criar("select", { id: "p-cat", name: "categoria" }, CATEGORIAS.map(([id, nome]) => criar("option", { value: id, text: nome, selected: id === p.categoria })))),
      criar("div", { class: "campo" }, criar("label", { for: "p-preco", text: "Preço (R$)" }), criar("input", { id: "p-preco", name: "preco_extra", type: "number", min: "0", step: "0.01", value: p.preco_extra }), criar("small", { class: "suave", text: "Em Extras é o preço de venda. Nas demais categorias é o adicional cobrado sobre o preço do tipo." })),
      criar("label", { class: "check" }, criar("input", { type: "checkbox", name: "ativo", checked: p.ativo }), criar("span", { text: "Ativo" })),
      criar("div", { class: "botoes espaco-cima" },
        criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar alterações" : "Cadastrar" }),
        edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: () => { edicao = null; desenharForm(); } }) : null));
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const c = form.elements;
    const dados = { nome: c.nome.value, categoria: c.categoria.value, preco_extra: c.preco_extra.value || 0, ativo: c.ativo.checked };
    const ok = await tentar(() => (edicao ? Adm.api.produtos.salvar(edicao.id, dados) : Adm.api.produtos.criar(dados)), edicao ? "Produto atualizado." : "Produto cadastrado.");
    if (ok) { edicao = null; desenharForm(); carregar(); }
  });

  function desenharLista() {
    const busca = criar("input", { type: "text", class: "busca", placeholder: "Buscar produto...", "aria-label": "Buscar" });
    const corpo = criar("tbody");
    function linhas(termo = "") {
      montar(corpo, lista.filter((p) => p.nome.toLowerCase().includes(termo.toLowerCase())).map((p) => criar("tr", {},
        criar("td", { text: p.nome }),
        criar("td", { text: NOME_CAT[p.categoria] }),
        criar("td", { text: p.preco_extra > 0 ? (p.categoria === "extra" ? "" : "+ ") + moeda(p.preco_extra) : "—" }),
        criar("td", {}, criar("span", { class: "selo " + (p.ativo ? "selo-ok" : "selo-neutro"), text: p.ativo ? "Ativo" : "Inativo" })),
        criar("td", { class: "acoes-linha" },
          criar("button", { class: "botao botao-contorno botao-p", text: "Editar", onclick: () => { edicao = p; desenharForm(); scrollTo(0, 0); } }),
          criar("button", {
            class: "botao botao-perigo botao-p", text: "Excluir",
            onclick: async () => {
              if (!confirm(`Excluir "${p.nome}"?`)) return;
              if (await Adm.tela.excluir(Adm.api.produtos.remover, p.id, "Produto excluído.")) carregar();
            },
          })))));
    }
    busca.addEventListener("input", () => linhas(busca.value));
    montar(alvoLista,
      criar("div", { class: "painel-topo" }, criar("h3", { text: `Produtos (${lista.length})` }), busca),
      criar("table", { class: "tabela" },
        criar("thead", {}, criar("tr", {}, ["Nome", "Categoria", "Preço", "Situação", ""].map((t) => criar("th", { text: t })))), corpo));
    linhas();
  }

  async function carregar() {
    try {
      lista = await Adm.api.produtos.listar();
      desenharLista();
    } catch (falha) {
      montar(alvoLista, criar("p", { class: "msg-erro", text: falha.message }));
    }
  }

  desenharForm();
  carregar();
});
