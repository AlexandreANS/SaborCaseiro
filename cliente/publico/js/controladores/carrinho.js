Sabor.controle.carrinho = {
  titulo: "Seu Carrinho",
  ativa: "carrinho",
  async montar(raiz, params) {
    const { aviso } = Dom;
    const { carrinho, sessao } = Sabor;
    const visao = Sabor.visao.carrinho;
    Sabor.visao.base.desenhar(raiz, visao.molde);

    let extras = [];
    let cotacao = null;
    let erro = null;
    let carregando = false;

    async function atualizar() {
      cotacao = null;
      erro = null;
      if (carrinho.itens().length) {
        carregando = true;
        desenhar();
        try {
          cotacao = await Sabor.api.cotar(carrinho.paraApi(), { tipo_entrega: "retirada", cupom: carrinho.cupom() });
          if (carrinho.cupom() && !cotacao.cupom) {
            aviso(cotacao.cupom_mensagem || "Cupom inválido.", "erro");
            carrinho.definirCupom("");
          }
        } catch (falha) {
          erro = falha.message;
        }
        carregando = false;
      }
      desenhar();
    }

    function mudarExtra(extra, quantidade) {
      const antes = carrinho.quantidadeExtra(extra.id);
      carrinho.definirExtra(extra, quantidade);
      if (quantidade > antes) aviso(`${extra.nome} adicionado ao carrinho.`, "ok");
      atualizar();
    }

    async function aplicarCupom(ev) {
      ev.preventDefault();
      const codigo = ev.target.elements.cupom.value.trim().toUpperCase();
      carrinho.definirCupom(codigo);
      await atualizar();
      if (codigo && cotacao && cotacao.cupom) aviso("Cupom aplicado!", "ok");
    }

    const acoesItem = {
      aumentar: (i) => {
        carrinho.alterarQuantidade(i.uid, 1);
        atualizar();
      },
      diminuir: (i) => {
        i.quantidade === 1 ? carrinho.remover(i.uid) : carrinho.alterarQuantidade(i.uid, -1);
        atualizar();
      },
    };
    const acoesResumo = {
      cupom: aplicarCupom,
      tentar: atualizar,
      esvaziar: () => {
        carrinho.limpar();
        atualizar();
      },
    };

    function desenhar() {
      const itens = carrinho.itens();
      visao.titulo(raiz, carrinho.total());
      visao.extras(raiz, extras, carrinho.quantidadeExtra, { mudarExtra });
      if (!itens.length) return visao.vazio(raiz);
      visao.itens(raiz, itens, cotacao, acoesItem);
      visao.resumo(raiz, { cotacao, erro, carregando, cupom: carrinho.cupom(), logado: sessao.logado() }, acoesResumo);
    }

    try {
      const cardapio = await Sabor.api.cardapio();
      extras = cardapio.extras || [];
      const fora = carrinho.reconciliar(cardapio);
      if (fora.length) aviso("Removidos do carrinho (fora do cardápio de hoje): " + fora.join(", ") + ".", "erro");
    } catch {}
    atualizar();
  },
};
