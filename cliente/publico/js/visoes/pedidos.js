window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.pedidos = (function () {
  const { criar, achar, montar, moeda } = Dom;

  const molde = `
<main class="conteudo">
  <h1 class="titulo-pagina">Meus Pedidos</h1>
  <div id="lista-pedidos" class="lista-pedidos" aria-live="polite"><p class="suave">Carregando pedidos...</p></div>
</main>
`;

  const FORMAS = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };
  const COR = {
    Esperando: "selo-aviso",
    Preparando: "selo-aviso",
    "Saiu para Entrega": "selo-aviso",
    "Pronto para Retirada": "selo-aviso",
    Concluído: "selo-ok",
    Cancelado: "selo-erro",
  };

  function cartao(p, aoRepetir) {
    return criar(
      "div",
      { class: "cartao-pedido" },
      criar(
        "a",
        { href: "#/pedido?id=" + p.id, class: "cartao-link" },
        criar(
          "div",
          { class: "cartao-pedido-topo" },
          criar("strong", { text: "Pedido #" + p.id }),
          criar("span", { class: "selo " + (COR[p.status] || ""), text: p.status_rotulo })
        ),
        criar("p", { class: "cartao-pedido-itens", text: p.resumo || "—" }),
        criar(
          "div",
          { class: "cartao-pedido-base" },
          criar("span", {
            class: "suave",
            text:
              new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) +
              " · " +
              (p.tipo_entrega === "entrega" ? "Entrega" : "Retirada") +
              " · " +
              FORMAS[p.forma_pagamento],
          }),
          criar("strong", { text: moeda(p.total) })
        )
      ),
      p.final
        ? criar("button", {
            type: "button",
            class: "botao botao-contorno botao-pequeno",
            onclick: () => aoRepetir(p.id),
            text: "Pedir de novo",
          })
        : null
    );
  }

  function lista(raiz, pedidos, acoes) {
    const alvo = achar("#lista-pedidos", raiz);
    if (!pedidos.length) {
      return montar(
        alvo,
        criar(
          "div",
          { class: "vazio" },
          criar("p", { text: "Você ainda não fez nenhum pedido." }),
          criar("a", { href: "#/montar", class: "botao botao-principal", text: "Montar minha marmita" })
        )
      );
    }
    montar(
      alvo,
      pedidos.map((p) => cartao(p, acoes.repetir)),
      acoes.temMais
        ? criar("button", {
            type: "button",
            class: "botao botao-contorno carregar-mais",
            text: "Carregar mais",
            onclick: acoes.maisPedidos,
          })
        : null
    );
  }

  function erro(raiz, mensagem, aoTentar) {
    montar(
      achar("#lista-pedidos", raiz),
      criar("p", { class: "msg-erro", text: mensagem }),
      criar("button", { class: "botao botao-contorno", onclick: aoTentar, text: "Tentar novamente" })
    );
  }

  return { molde, lista, erro };
})();
