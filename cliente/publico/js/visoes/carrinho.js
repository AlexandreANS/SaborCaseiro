window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.carrinho = (function () {
  const { criar, achar, montar, moeda } = Dom;
  const { linha } = Sabor.visao.base;

  const molde = `
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
`;

  function titulo(raiz, qtd) {
    achar("#carrinho-qtd", raiz).textContent = qtd ? `(${qtd} ${qtd === 1 ? "item selecionado" : "itens selecionados"})` : "";
  }

  function extras(raiz, lista, quantidadeDe, acoes) {
    const alvo = achar("#extras", raiz);
    alvo.hidden = !lista.length;
    if (!lista.length) return;
    montar(
      alvo,
      criar("h2", { text: "Bebidas e sobremesas" }),
      criar("p", { class: "suave", text: "Adicione quantas quiser ao seu pedido." }),
      lista.map((e) => {
        const qtd = quantidadeDe(e.id);
        return criar(
          "div",
          { class: "extra" + (qtd ? " marcado" : ""), "data-extra": e.id },
          criar("div", {}, criar("strong", { text: e.nome }), criar("span", { class: "extra-preco", text: moeda(e.preco) })),
          qtd
            ? criar(
                "div",
                { class: "quantidade" },
                criar("button", {
                  "aria-label": "Diminuir " + e.nome,
                  onclick: () => acoes.mudarExtra(e, qtd - 1),
                  text: qtd === 1 ? "🗑" : "–",
                }),
                criar("span", { text: qtd }),
                criar("button", { "aria-label": "Aumentar " + e.nome, onclick: () => acoes.mudarExtra(e, qtd + 1), text: "+" })
              )
            : criar("button", { class: "botao botao-contorno botao-pequeno", onclick: () => acoes.mudarExtra(e, 1), text: "Adicionar" })
        );
      })
    );
  }

  function vazio(raiz) {
    montar(
      achar("#lista-itens", raiz),
      criar(
        "div",
        { class: "vazio" },
        criar("p", { text: "Seu carrinho está vazio." }),
        criar("a", { href: "#/montar", class: "botao botao-principal", text: "Montar minha marmita" })
      )
    );
    achar("#resumo-pedido", raiz).hidden = true;
    titulo(raiz, 0);
  }

  function item(i, cotado, acoes) {
    const ehExtra = !!i.extra_id;
    const unico = i.quantidade === 1;
    const adic = cotado && !ehExtra ? cotado.ingredientes.filter((g) => g.adicional).reduce((s, g) => s + g.preco_extra, 0) : 0;
    return criar(
      "div",
      { class: "item" + (ehExtra ? " item-extra" : ""), "data-id-item": i.uid },
      criar(
        "div",
        {},
        criar("span", { class: "item-tipo", text: ehExtra ? "Bebida / sobremesa" : "Marmita" }),
        criar("h2", { text: i.titulo || "Item" }),
        ehExtra ? criar("p", { class: "suave", text: moeda(i.preco) + " cada" }) : criar("p", { text: i.descricao }),
        adic > 0 ? criar("p", { class: "suave", text: `${moeda(cotado.preco_unitario - adic)} + ${moeda(adic)} de extras` }) : null,
        i.observacoes ? criar("p", { class: "obs", text: "Obs: " + i.observacoes }) : null
      ),
      criar(
        "div",
        { class: "qtd-preco" },
        criar(
          "div",
          { class: "quantidade" },
          criar("button", {
            "aria-label": unico ? "Remover " + i.titulo : "Diminuir quantidade de " + i.titulo,
            onclick: () => acoes.diminuir(i),
            text: unico ? "🗑" : "–",
          }),
          criar("span", { text: i.quantidade }),
          criar("button", { "aria-label": "Aumentar quantidade de " + i.titulo, onclick: () => acoes.aumentar(i), text: "+" })
        ),
        criar("strong", { text: cotado ? moeda(cotado.preco_unitario * i.quantidade) : "…" })
      )
    );
  }

  function itens(raiz, lista, cotacao, acoes) {
    const temMarmita = lista.some((i) => !i.extra_id);
    montar(
      achar("#lista-itens", raiz),
      lista.map((i, pos) => item(i, cotacao && cotacao.itens[pos], acoes)),
      criar("a", {
        href: "#/montar",
        class: "botao botao-contorno",
        text: temMarmita ? "+ Adicionar outra marmita" : "+ Montar uma marmita",
      })
    );
    achar("#resumo-pedido", raiz).hidden = false;
  }

  function resumo(raiz, d, acoes) {
    const caixa = achar("#resumo-pedido", raiz);
    const campoAtual = caixa.querySelector("input[name=cupom]");
    const digitado = campoAtual ? campoAtual.value : d.cupom;
    const tinhaFoco = campoAtual && document.activeElement === campoAtual;
    const cot = d.cotacao;
    montar(
      caixa,
      criar("h2", { text: "Resumo do Pedido" }),
      d.erro ? criar("p", { class: "msg-erro", text: d.erro }) : null,
      cot
        ? [
            linha("Subtotal", moeda(cot.subtotal)),
            cot.adicionais > 0 ? linha("Adicionais (opções com custo)", "+ " + moeda(cot.adicionais)) : null,
            cot.desconto > 0 ? linha(`Cupom ${cot.cupom}`, "– " + moeda(cot.desconto), "desconto") : null,
            linha("Taxa de Entrega", "calculada no checkout"),
          ]
        : d.carregando
          ? criar("p", { class: "suave", text: "Calculando..." })
          : null,
      criar(
        "form",
        { class: "linha-cupom", onsubmit: acoes.cupom },
        criar("input", {
          type: "text",
          name: "cupom",
          placeholder: "SABORCASEIRO10",
          value: digitado,
          "aria-label": "Cupom de desconto",
          autocapitalize: "characters",
        }),
        criar("button", { type: "submit", class: "botao botao-contorno", text: "Aplicar" })
      ),
      cot ? linha("Total parcial", moeda(cot.total), "total") : null,
      d.erro
        ? criar(
            "div",
            {},
            criar("button", { class: "botao botao-contorno botao-cheio", onclick: acoes.tentar, text: "Tentar novamente" }),
            criar("button", { class: "botao botao-leve botao-cheio", onclick: acoes.esvaziar, text: "Esvaziar carrinho" })
          )
        : criar("a", {
            href: "#/checkout",
            class: "botao botao-principal botao-cheio espaco-cima",
            "aria-disabled": String(!cot),
            text: "Ir para o Checkout",
          }),
      d.logado
        ? null
        : criar("p", { class: "suave nota-login", text: "Você só precisa entrar na sua conta na hora de finalizar o pedido." }),
      criar("a", { href: "#/montar", class: "botao botao-leve botao-cheio espaco-cima", text: "Continuar Comprando" })
    );
    if (tinhaFoco) caixa.querySelector("input[name=cupom]").focus();
  }

  return { molde, titulo, extras, vazio, itens, resumo };
})();
