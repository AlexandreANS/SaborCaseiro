Sabor.telas.carrinho = {
  titulo: "Seu Carrinho",
  ativa: "carrinho",
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<main class="conteudo pagina-carrinho">
  <h1>Seu Carrinho <small id="carrinho-qtd" class="titulo-aux"></small></h1>

  <div class="layout-carrinho">
    <div>
      <div id="lista-itens"></div>
      <section class="extras" id="extras" hidden></section>
    </div>
    <aside class="caixa-pedido" id="resumo-pedido" hidden></aside>
  </div>
</main>
`);
    const { criar, achar, montar, moeda, aviso } = Sabor.tela;
    const { carrinho } = Sabor.dados;

    const lista = achar("#lista-itens", raiz);
    const caixa = achar("#resumo-pedido", raiz);
    const titulo = achar("#carrinho-qtd", raiz);
    const alvoExtras = achar("#extras", raiz);
    let extras = [];
    let cotacao = null;
    let erroCotacao = null;
    let carregando = false;

    async function atualizar() {
      cotacao = null;
      erroCotacao = null;
      if (carrinho.itens().length) {
        carregando = true;
        desenhar();
        try {
          cotacao = await Sabor.api.cotar(carrinho.paraApi(), { tipo_entrega: "retirada", cupom: carrinho.cupom() });
          if (carrinho.cupom() && !cotacao.cupom) {
            aviso(cotacao.cupom_mensagem || "Cupom inválido.", "erro");
            carrinho.definirCupom("");
          }
        } catch (erro) {
          erroCotacao = erro.message;
        }
        carregando = false;
      }
      desenhar();
    }

    function mudarExtra(extra, quantidade) {
      carrinho.definirExtra(extra, quantidade);
      atualizar();
    }

    function desenharExtras() {
      alvoExtras.hidden = !extras.length;
      if (!extras.length) return;
      montar(alvoExtras,
        criar("h3", { text: "Bebidas e sobremesas" }),
        criar("p", { class: "suave", text: "Adicione quantas quiser ao seu pedido." }),
        extras.map((e) => {
          const qtd = carrinho.quantidadeExtra(e.id);
          return criar("div", { class: "extra" + (qtd ? " marcado" : ""), "data-extra": e.id },
            criar("div", {}, criar("strong", { text: e.nome }), criar("span", { class: "extra-preco", text: moeda(e.preco) })),
            qtd
              ? criar("div", { class: "quantidade" },
                  criar("button", { "aria-label": "Diminuir " + e.nome, onclick: () => mudarExtra(e, qtd - 1), text: qtd === 1 ? "🗑" : "–" }),
                  criar("span", { text: qtd }),
                  criar("button", { "aria-label": "Aumentar " + e.nome, onclick: () => mudarExtra(e, qtd + 1), text: "+" }))
              : criar("button", { class: "botao botao-contorno botao-pequeno", onclick: () => mudarExtra(e, 1), text: "Adicionar" }));
        }));
    }

    function linha(rotulo, valor, classe = "") {
      return criar("div", { class: "linha-resumo " + classe }, criar("span", { text: rotulo }), criar("span", { text: valor }));
    }

    function desenhar() {
      const itens = carrinho.itens();
      const qtd = carrinho.total();
      titulo.textContent = `(${qtd} ${qtd === 1 ? "item selecionado" : "itens selecionados"})`;

      desenharExtras();
      if (!itens.length) {
        lista.replaceChildren(criar("div", { class: "vazio" },
          criar("p", { text: "Seu carrinho está vazio." }),
          criar("a", { href: "#/montar", class: "botao botao-principal", text: "Montar minha marmita" })));
        caixa.hidden = true;
        titulo.textContent = "";
        return;
      }
      caixa.hidden = false;

      const marmitas = itens.map((item, pos) => ({ item, pos })).filter((x) => !x.item.extra_id);
      montar(lista,
        marmitas.map(({ item, pos }) => {
          const cotado = cotacao && cotacao.itens[pos];
          const unico = item.quantidade === 1;
          return criar("div", { class: "item", "data-id-item": item.uid },
            criar("div", {},
              criar("h4", { text: item.titulo }),
              criar("p", { text: item.descricao }),
              item.observacoes ? criar("p", { class: "obs", text: "Obs: " + item.observacoes }) : null),
            criar("div", { class: "qtd-preco" },
              criar("div", { class: "quantidade" },
                criar("button", {
                  "aria-label": unico ? "Remover item" : "Diminuir quantidade",
                  onclick: () => { unico ? carrinho.remover(item.uid) : carrinho.alterarQuantidade(item.uid, -1); atualizar(); },
                  text: unico ? "🗑" : "–" }),
                criar("span", { text: item.quantidade }),
                criar("button", { "aria-label": "Aumentar quantidade", onclick: () => { carrinho.alterarQuantidade(item.uid, 1); atualizar(); }, text: "+" })),
              criar("strong", { text: cotado ? moeda(cotado.preco_unitario * item.quantidade) : "…" })));
        }),
        criar("a", { href: "#/montar", class: "botao botao-contorno", text: marmitas.length ? "+ Adicionar outra marmita" : "+ Montar uma marmita" }));

      const campoAtual = caixa.querySelector("input[name=cupom]");
      const digitado = campoAtual ? campoAtual.value : carrinho.cupom();
      const tinhaFoco = campoAtual && document.activeElement === campoAtual;
      const formCupom = criar("form", { class: "linha-cupom", onsubmit: aplicarCupom },
        criar("input", { type: "text", name: "cupom", placeholder: "SABORCASEIRO10", value: digitado, "aria-label": "Cupom de desconto", autocapitalize: "characters" }),
        criar("button", { type: "submit", class: "botao botao-contorno", text: "Aplicar" }));

      montar(caixa,
        criar("h4", { text: "Resumo do Pedido" }),
        erroCotacao ? criar("p", { class: "msg-erro", text: erroCotacao }) : null,
        cotacao ? [
          linha("Subtotal", moeda(cotacao.subtotal)),
          cotacao.adicionais > 0 ? linha("Adicionais (opções com custo)", "+ " + moeda(cotacao.adicionais)) : null,
          cotacao.desconto > 0 ? linha(`Cupom ${cotacao.cupom}`, "– " + moeda(cotacao.desconto), "desconto") : null,
          linha("Taxa de Entrega", "calculada no checkout"),
        ] : (carregando ? criar("p", { class: "suave", text: "Calculando..." }) : null),
        formCupom,
        cotacao ? linha("Total parcial", moeda(cotacao.total), "total") : null,
        erroCotacao
          ? criar("div", {},
              criar("button", { class: "botao botao-contorno botao-cheio", onclick: atualizar, text: "Tentar novamente" }),
              criar("button", { class: "botao botao-leve botao-cheio", onclick: () => { carrinho.limpar(); atualizar(); }, text: "Esvaziar carrinho" }))
          : criar("a", { href: "#/checkout", class: "botao botao-principal botao-cheio espaco-cima", "aria-disabled": String(!cotacao), text: "Ir para o Checkout" }),
        Sabor.dados.sessao.logado() ? null : criar("p", { class: "suave nota-login", text: "Você só precisa entrar na sua conta na hora de finalizar o pedido." }),
      criar("a", { href: "#/montar", class: "botao botao-leve botao-cheio espaco-cima", text: "Continuar Comprando" }));
      if (tinhaFoco) caixa.querySelector("input[name=cupom]").focus();
    }

    async function aplicarCupom(ev) {
      ev.preventDefault();
      const codigo = ev.target.elements.cupom.value.trim().toUpperCase();
      carrinho.definirCupom(codigo);
      await atualizar();
      if (codigo && cotacao && cotacao.cupom) aviso("Cupom aplicado!", "ok");
    }

    try {
      const c = await Sabor.api.cardapio();
      extras = c.extras || [];
      const fora = carrinho.reconciliar(c);
      if (fora.length) aviso("Removidos do carrinho (fora do cardápio de hoje): " + fora.join(", ") + ".", "erro");
    } catch {}
    atualizar();
  },
};
