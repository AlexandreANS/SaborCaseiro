document.addEventListener("DOMContentLoaded", async () => {
  const { criar, achar, montar, moeda, tentar, iniciar, caixas, marcadosDe, CATEGORIAS_MARMITA: CATEGORIAS } = Adm.tela;
  if (!iniciar("tipos", "Tipos de Marmita", "Defina preço, categorias e produtos permitidos de cada tipo. Bebidas e sobremesas ficam fora da marmita.")) return;

  const raiz = achar("#conteudo");
  let lista = [];
  let produtos = [];
  let edicao = null;

  const form = criar("form", { class: "painel", id: "form-tipo" });
  const alvoLista = criar("div", { class: "painel" });
  montar(raiz, criar("div", { class: "duas-colunas inverso" }, alvoLista, form));

  function desenharForm() {
    const t = edicao || { nome: "", descricao: "", preco: "", ativo: true, categorias: [], produto_ids: [] };
    const regras = Object.fromEntries(t.categorias.map((c) => [c.categoria, c]));
    const linhasCat = CATEGORIAS.map(([id, nome]) => {
      const r = regras[id];
      return criar("div", { class: "linha-categoria", "data-cat": id },
        criar("label", { class: "check" }, criar("input", { type: "checkbox", name: "usa-" + id, checked: !!r }), criar("span", { text: nome })),
        criar("input", { type: "number", name: "min-" + id, min: "0", max: "20", value: r ? r.minimo : 1, "aria-label": "Mínimo de " + nome }),
        criar("input", { type: "number", name: "max-" + id, min: "0", max: "20", value: r ? r.maximo : 1, "aria-label": "Máximo de " + nome }));
    });

    montar(form,
      criar("div", { class: "painel-topo" }, criar("h3", { text: edicao ? "Editar tipo" : "Novo tipo" })),
      criar("div", { class: "linha-campos" },
        criar("div", { class: "campo" }, criar("label", { for: "t-nome", text: "Nome" }), criar("input", { id: "t-nome", name: "nome", value: t.nome, maxlength: "80", required: true })),
        criar("div", { class: "campo" }, criar("label", { for: "t-preco", text: "Preço (R$)" }), criar("input", { id: "t-preco", name: "preco", type: "number", min: "0", step: "0.01", value: t.preco, required: true }))),
      criar("div", { class: "campo" }, criar("label", { for: "t-desc", text: "Descrição" }), criar("input", { id: "t-desc", name: "descricao", value: t.descricao || "", maxlength: "300" })),
      criar("h4", { text: "Categorias do tipo" }),
      criar("div", { class: "linha-categoria cabecalho" }, criar("span", { text: "Categoria" }), criar("span", { text: "Mín." }), criar("span", { text: "Máx." })),
      linhasCat,
      criar("h4", { class: "espaco-cima", text: "Produtos permitidos neste tipo" }),
      criar("div", { id: "t-produtos" }, caixas(produtos.filter((p) => p.categoria !== "extra"), new Set(t.produto_ids))),
      criar("label", { class: "check espaco-cima" }, criar("input", { type: "checkbox", name: "ativo", checked: t.ativo }), criar("span", { text: "Tipo ativo" })),
      criar("div", { class: "botoes espaco-cima" },
        criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar alterações" : "Cadastrar tipo" }),
        edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: () => { edicao = null; desenharForm(); } }) : null));
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const c = form.elements;
    const dados = {
      nome: c.nome.value, descricao: c.descricao.value, preco: c.preco.value, ativo: c.ativo.checked,
      categorias: CATEGORIAS.filter(([id]) => c["usa-" + id].checked).map(([id]) => ({ categoria: id, minimo: Number(c["min-" + id].value), maximo: Number(c["max-" + id].value) })),
      produto_ids: marcadosDe(achar("#t-produtos")),
    };
    const ok = await tentar(() => (edicao ? Adm.api.tipos.salvar(edicao.id, dados) : Adm.api.tipos.criar(dados)), edicao ? "Tipo atualizado." : "Tipo cadastrado.");
    if (ok) { edicao = null; desenharForm(); carregar(); }
  });

  function desenharLista() {
    montar(alvoLista,
      criar("div", { class: "painel-topo" }, criar("h3", { text: `Tipos (${lista.length})` })),
      criar("table", { class: "tabela" },
        criar("thead", {}, criar("tr", {}, ["Tipo", "Preço", "Produtos", "Situação", ""].map((t) => criar("th", { text: t })))),
        criar("tbody", {}, lista.map((t) => criar("tr", {},
          criar("td", {}, criar("strong", { text: t.nome }), criar("br"), criar("small", { class: "suave", text: t.descricao || "" })),
          criar("td", { text: moeda(t.preco) }),
          criar("td", { text: t.produto_ids.length }),
          criar("td", {}, criar("span", { class: "selo " + (t.ativo ? "selo-ok" : "selo-neutro"), text: t.ativo ? "Ativo" : "Inativo" })),
          criar("td", { class: "acoes-linha" },
            criar("button", { class: "botao botao-contorno botao-p", text: "Editar", onclick: () => { edicao = t; desenharForm(); scrollTo(0, 0); } }),
            criar("button", {
              class: "botao botao-perigo botao-p", text: "Excluir",
              onclick: async () => {
                if (!confirm(`Excluir o tipo "${t.nome}"?`)) return;
                if (await Adm.tela.excluir(Adm.api.tipos.remover, t.id, "Tipo excluído.")) carregar();
              },
            })))))));
  }

  async function carregar() {
    try {
      [lista, produtos] = await Promise.all([Adm.api.tipos.listar(), Adm.api.produtos.listar()]);
      desenharLista();
      if (!form.children.length || !edicao) desenharForm();
    } catch (falha) {
      montar(alvoLista, criar("p", { class: "msg-erro", text: falha.message }));
    }
  }

  carregar();
});
