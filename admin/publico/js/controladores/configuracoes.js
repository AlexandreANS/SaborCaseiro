Adm.controle = Adm.controle || {};

Adm.controle.configuracoes = {
  async montar() {
    const { tentar } = Adm.app;
    const visao = Adm.visao.configuracoes;
    const { erro } = Adm.visao.base;
    if (
      !Adm.app.iniciar("configuracoes", "Configurações", "Dados do restaurante, bairros e taxas, cupons de desconto e mensagens de recusa.")
    )
      return;

    const raiz = Dom.achar("#conteudo");
    Dom.montar(raiz);

    function crud({ id, titulo, descricao, api, formulario, dados, lista, chave, salvo, removido }) {
      const { form, alvo } = visao.secao(raiz, titulo, descricao, id);
      let itens = [];
      let edicao = null;
      const desenharForm = () =>
        formulario(form, edicao, () => {
          edicao = null;
          desenharForm();
        });

      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const corpo = dados(form);
        const ok = await tentar(() => (edicao ? api.salvar(edicao[chave], corpo) : api.criar(corpo)), salvo);
        if (ok) {
          edicao = null;
          desenharForm();
          carregar();
        }
      });

      const acoes = {
        editar: (item) => {
          edicao = item;
          desenharForm();
        },
        excluir: async (item) => {
          if (await Adm.app.excluir(api.remover, item[chave], removido)) carregar();
        },
        alternar: async (item) => {
          if (await tentar(() => api.salvar(item[chave], { ...item, ativo: !item.ativo }))) carregar();
        },
      };

      async function carregar() {
        try {
          itens = await api.listar();
          lista(alvo, itens, acoes);
        } catch (falha) {
          erro(alvo, falha.message);
        }
      }

      desenharForm();
      carregar();
    }

    function loja() {
      const { form, alvo } = visao.secao(
        raiz,
        "Dados do restaurante",
        "Aparecem para o cliente: rodapé, retirada, prazos e horário de funcionamento.",
        "loja"
      );
      alvo.hidden = true;
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const salvo = await tentar(() => Adm.api.loja.salvar(visao.lojaDados(form)), "Dados salvos.");
        if (salvo && salvo.horario) visao.lojaForm(form, salvo);
      });
      Adm.api.loja
        .ver()
        .then((l) => visao.lojaForm(form, l))
        .catch((falha) => erro(form, falha.message));
    }

    loja();
    crud({
      id: "bairros",
      titulo: "Bairros e taxa de entrega",
      descricao:
        "O cliente informa o CEP e o bairro vem dele: só entregamos em bairros ativos aqui, com o mesmo nome do CEP (acentos e maiúsculas não importam).",
      api: Adm.api.bairros,
      formulario: visao.bairroForm,
      dados: visao.bairroDados,
      lista: visao.bairroLista,
      chave: "id",
      salvo: "Bairro salvo.",
      removido: "Bairro excluído.",
    });
    crud({
      id: "cupons",
      titulo: "Cupons de desconto",
      descricao: "Defina o percentual, as condições de uso e ative ou desative quando quiser.",
      api: Adm.api.cupons,
      formulario: visao.cupomForm,
      dados: visao.cupomDados,
      lista: visao.cupomLista,
      chave: "codigo",
      salvo: "Cupom salvo.",
      removido: "Cupom excluído.",
    });
    crud({
      id: "recusas",
      titulo: "Mensagens de recusa",
      descricao: "Textos prontos que o gerente escolhe ao recusar um pedido.",
      api: Adm.api.recusas,
      formulario: visao.recusaForm,
      dados: (f) => ({ texto: f.elements.texto.value }),
      lista: visao.recusaLista,
      chave: "id",
      salvo: "Mensagem salva.",
      removido: "Mensagem excluída.",
    });
  },
};
