Sabor.telas.pedidos = {
  titulo: "Meus Pedidos",
  ativa: "pedidos",
  exigeLogin: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<main class="conteudo">
  <h1 class="titulo-pagina">Meus Pedidos</h1>
  <div id="lista-pedidos" class="lista-pedidos" aria-live="polite"><p class="suave">Carregando pedidos...</p></div>
</main>
`);
    const { criar, achar, montar, moeda, exigirLogin } = Sabor.tela;

    const alvo = achar("#lista-pedidos", raiz);
    const FORMAS = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };
    const COR = {
      Esperando: "selo-aviso", Preparando: "selo-aviso", "Saiu para Entrega": "selo-aviso",
      "Pronto para Retirada": "selo-aviso", Concluído: "selo-ok", Cancelado: "selo-erro",
    };
    const FINAIS = ["Concluído", "Cancelado"];
    let assinatura = "";
    let limite = 20;
    const PASSO = 20;

    function desenhar(lista) {
      if (!lista.length) {
        montar(alvo, criar("div", { class: "vazio" },
          criar("p", { text: "Você ainda não fez nenhum pedido." }),
          criar("a", { href: "#/montar", class: "botao botao-principal", text: "Montar minha marmita" })));
        return;
      }
      montar(alvo, lista.map((p) => criar("div", { class: "cartao-pedido" },
        criar("a", { href: "#/pedido?id=" + p.id, class: "cartao-link" },
          criar("div", { class: "cartao-pedido-topo" },
            criar("strong", { text: "Pedido #" + p.id }),
            criar("span", { class: "selo " + (COR[p.status] || ""), text: p.status_rotulo })),
          criar("p", { class: "cartao-pedido-itens", text: p.resumo || "—" }),
          criar("div", { class: "cartao-pedido-base" },
            criar("span", { class: "suave", text: new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) +
              " · " + (p.tipo_entrega === "entrega" ? "Entrega" : "Retirada") + " · " + FORMAS[p.forma_pagamento] }),
            criar("strong", { text: moeda(p.total) }))),
        FINAIS.includes(p.status)
          ? criar("button", { type: "button", class: "botao botao-contorno botao-pequeno", onclick: () => Sabor.tela.repetirPedido(p.id), text: "Pedir de novo" })
          : null)),
        lista.length >= limite
          ? criar("button", { type: "button", class: "botao botao-contorno carregar-mais", text: "Carregar mais", onclick: () => { limite += PASSO; assinatura = ""; carregar(); } })
          : null);
    }

    async function carregar() {
      try {
        const lista = await Sabor.api.pedidos(limite);
        const nova = JSON.stringify(lista.map((p) => [p.id, p.status, p.total_msgs]));
        if (nova === assinatura) return;
        assinatura = nova;
        desenhar(lista);
      } catch (falha) {
        if (falha.status === 401) return exigirLogin();
        if (assinatura) return;
        montar(alvo, criar("p", { class: "msg-erro", text: falha.message }),
          criar("button", { class: "botao botao-contorno", onclick: () => Sabor.rota.abrir(), text: "Tentar novamente" }));
      }
    }

    await carregar();
    Sabor.rota.repetir(carregar, 20000);
    Sabor.rota.ouvir("/pedidos/eventos", () => carregar());
  },
};
