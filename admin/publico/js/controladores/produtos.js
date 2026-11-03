Adm.controle = Adm.controle || {};

Adm.controle.produtos = {
  async montar() {
    const { tentar } = Adm.app;
    const visao = Adm.visao.produtos;
    if (!Adm.app.iniciar("produtos", "Produtos", "Ingredientes das marmitas e extras (bebidas e sobremesas vendidas à parte no carrinho)."))
      return;

    const { form, lista: alvoLista } = visao.casca(Dom.achar("#conteudo"));
    let produtos = [];
    let edicao = null;

    const desenharForm = () =>
      visao.formulario(form, edicao, {
        cancelar: () => {
          edicao = null;
          desenharForm();
        },
      });

    const acoes = {
      editar: (p) => {
        edicao = p;
        desenharForm();
        scrollTo(0, 0);
      },
      excluir: async (p) => {
        if (!confirm(`Excluir "${p.nome}"?`)) return;
        if (await Adm.app.excluir(Adm.api.produtos.remover, p.id, "Produto excluído.")) carregar();
      },
    };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const c = form.elements;
      const dados = { nome: c.nome.value, categoria: c.categoria.value, preco_extra: c.preco_extra.value || 0, ativo: c.ativo.checked };
      const ok = await tentar(
        () => (edicao ? Adm.api.produtos.salvar(edicao.id, dados) : Adm.api.produtos.criar(dados)),
        edicao ? "Produto atualizado." : "Produto cadastrado."
      );
      if (ok) {
        edicao = null;
        desenharForm();
        carregar();
      }
    });

    async function carregar() {
      try {
        produtos = await Adm.api.produtos.listar();
        visao.lista(alvoLista, produtos, acoes);
      } catch (falha) {
        Adm.visao.base.erro(alvoLista, falha.message);
      }
    }

    desenharForm();
    carregar();
  },
};
