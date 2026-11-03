Adm.controle = Adm.controle || {};

Adm.controle.tipos = {
  async montar() {
    const { tentar } = Adm.app;
    const visao = Adm.visao.tipos;
    if (
      !Adm.app.iniciar(
        "tipos",
        "Tipos de Marmita",
        "Defina preço, categorias e produtos permitidos de cada tipo. Bebidas e sobremesas ficam fora da marmita."
      )
    )
      return;

    const { form, lista: alvoLista } = visao.casca(Dom.achar("#conteudo"));
    let tipos = [];
    let produtos = [];
    let edicao = null;

    const desenharForm = () =>
      visao.formulario(form, edicao, produtos, {
        cancelar: () => {
          edicao = null;
          desenharForm();
        },
      });

    const acoes = {
      editar: (t) => {
        edicao = t;
        desenharForm();
        scrollTo(0, 0);
      },
      excluir: async (t) => {
        if (!confirm(`Excluir o tipo "${t.nome}"?`)) return;
        if (await Adm.app.excluir(Adm.api.tipos.remover, t.id, "Tipo excluído.")) carregar();
      },
    };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const dados = visao.dadosDoForm(form);
      const ok = await tentar(
        () => (edicao ? Adm.api.tipos.salvar(edicao.id, dados) : Adm.api.tipos.criar(dados)),
        edicao ? "Tipo atualizado." : "Tipo cadastrado."
      );
      if (ok) {
        edicao = null;
        desenharForm();
        carregar();
      }
    });

    async function carregar() {
      try {
        [tipos, produtos] = await Promise.all([Adm.api.tipos.listar(), Adm.api.produtos.listar()]);
        visao.lista(alvoLista, tipos, acoes);
        if (!form.children.length || !edicao) desenharForm();
      } catch (falha) {
        Adm.visao.base.erro(alvoLista, falha.message);
      }
    }

    carregar();
  },
};
