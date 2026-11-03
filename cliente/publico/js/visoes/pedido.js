window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.pedido = (function () {
  const { criar, achar, montar, moeda } = Dom;

  const molde = `
<main class="conteudo">
  <div class="confirmacao" id="confirmacao" aria-live="polite">
    <p class="suave">Carregando pedido...</p>
  </div>

  <section class="chat" id="chat" hidden>
    <h2>Fale com a equipe</h2>
    <div class="chat-lista" id="chat-lista" aria-live="polite"></div>
    <form class="chat-form" id="chat-form">
      <input type="text" name="texto" maxlength="500" placeholder="Escreva sua mensagem" autocomplete="off" aria-label="Mensagem">
      <button type="submit" class="botao botao-principal">Enviar</button>
    </form>
  </section>
</main>
`;

  const PAGAMENTOS = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" };

  function textos(pedido) {
    const entrega = pedido.tipo_entrega === "entrega";
    const n = pedido.id;
    return {
      Esperando: [
        "Aguardando confirmação",
        `Seu pedido #${n} foi enviado e está aguardando o restaurante aceitar. Esta tela atualiza sozinha.`,
      ],
      Preparando: ["Pedido aceito!", `O restaurante aceitou o pedido #${n} e já está preparando.`],
      "Saiu para Entrega": ["Saiu para entrega", `O pedido #${n} está a caminho do seu endereço.`],
      "Pronto para Retirada": ["Pronto para retirada", `O pedido #${n} está pronto no balcão.`],
      Concluído: [
        entrega ? "Pedido entregue!" : "Pedido retirado!",
        `O pedido #${n} foi ${entrega ? "entregue" : "retirado"}. Bom apetite!`,
      ],
      Cancelado:
        pedido.cancelado_por === "cliente"
          ? ["Pedido cancelado", `Você cancelou o pedido #${n}.`]
          : ["Pedido recusado", `O restaurante não pôde aceitar o pedido #${n}.`],
    }[pedido.status];
  }

  function itens(pedido) {
    return pedido.itens.map((i) => [
      criar(
        "li",
        {},
        criar("span", { text: `${i.quantidade}x ${i.tipo_nome}` }),
        criar("span", { text: moeda(i.preco_unitario * i.quantidade) })
      ),
      ...i.ingredientes
        .filter((g) => g.adicional)
        .map((g) =>
          criar(
            "li",
            { class: "sub" },
            criar("span", { text: "+ extra: " + g.nome }),
            criar("span", { text: moeda(g.preco_extra * i.quantidade) })
          )
        ),
    ]);
  }

  function pedido(raiz, p, loja, acoes) {
    const pos = p.passos.findIndex((e) => e.status === p.status);
    const cancelado = p.status === "Cancelado";
    const aguardando = p.status === "Esperando";
    const entrega = p.tipo_entrega === "entrega";
    const [titulo, frase] = textos(p);

    montar(
      achar("#confirmacao", raiz),
      criar("div", {
        class: "confirma-icone" + (cancelado ? " cancelado" : aguardando ? " aguardando" : ""),
        text: cancelado ? "✕" : aguardando ? "⏳" : "✓",
      }),
      criar("h1", { text: titulo }),
      criar("p", { text: frase }),
      cancelado && p.motivo_recusa ? criar("p", { class: "motivo-recusa" }, criar("strong", { text: "Motivo: " }), p.motivo_recusa) : null,
      cancelado
        ? null
        : criar(
            "div",
            { class: "etapas-status", role: "list", "aria-label": "Status do pedido" },
            p.passos.map((e, i) =>
              criar("div", { class: "etapa-status" + (i < pos ? " feito" : i === pos ? " ativo" : ""), role: "listitem", text: e.rotulo })
            )
          ),
      criar(
        "div",
        { class: "confirma-detalhes" },
        criar("h2", { text: "Itens do Pedido" }),
        criar("ul", { class: "resumo-lista" }, itens(p)),
        p.desconto > 0 ? criar("p", { text: `Desconto (${p.cupom}): – ${moeda(p.desconto)}` }) : null,
        entrega ? criar("p", { text: `Taxa de entrega: ${moeda(p.taxa_entrega)}` }) : null,
        criar("p", {}, criar("strong", { text: "Total: " + moeda(p.total) })),
        criar("h2", { text: entrega ? "Endereço de Entrega" : "Retirada no Balcão" }),
        entrega
          ? criar(
              "p",
              {},
              `${p.rua}, ${p.numero}${p.complemento ? " - " + p.complemento : ""}`,
              criar("br"),
              `${p.bairro_nome}, São Paulo - SP${p.cep ? " | CEP: " + p.cep : ""}`
            )
          : criar("p", { text: loja.endereco || "" }),
        criar("h2", { text: "Pagamento & Prazo" }),
        criar(
          "p",
          {},
          criar("span", {
            class: "selo selo-aviso",
            text: PAGAMENTOS[p.forma_pagamento] + " (na " + (entrega ? "entrega" : "retirada") + ")",
          }),
          " · Previsão: ",
          p.horario_agendado ? "agendado para " + p.horario_agendado : (entrega ? loja.prazo_entrega : loja.prazo_retirada) || "—"
        ),
        p.observacoes ? criar("p", { class: "obs", text: "Obs: " + p.observacoes }) : null
      ),
      aguardando
        ? criar("button", {
            type: "button",
            class: "botao botao-cancelar botao-cheio espaco-baixo",
            onclick: acoes.cancelar,
            text: "Cancelar pedido",
          })
        : null,
      loja.telefone
        ? criar("a", {
            href: "tel:+55" + loja.telefone.replace(/\D/g, ""),
            class: "botao botao-contorno botao-cheio espaco-baixo",
            text: "Falar com o restaurante",
          })
        : null,
      criar("a", { href: "#/pedidos", class: "botao botao-leve botao-cheio espaco-baixo", text: "Ver meus pedidos" }),
      acoes.final
        ? criar("button", {
            type: "button",
            class: "botao botao-principal botao-cheio espaco-baixo",
            onclick: () => acoes.repetir(p.id),
            text: "Pedir de novo",
          })
        : null,
      criar("a", { href: "#/montar", class: "botao botao-leve botao-cheio", text: "Voltar ao Cardápio" })
    );
  }

  function erro(raiz, mensagem) {
    montar(
      achar("#confirmacao", raiz),
      criar("h1", { text: "Não foi possível abrir o pedido" }),
      criar("p", { class: "msg-erro", text: mensagem }),
      criar("a", { href: "#/home", class: "botao botao-principal", text: "Ir para o início" })
    );
  }

  function chat(raiz, lista) {
    const alvo = achar("#chat-lista", raiz);
    const fim = alvo.scrollTop + alvo.clientHeight >= alvo.scrollHeight - 30;
    montar(
      alvo,
      lista.length
        ? lista.map((m) =>
            criar(
              "div",
              { class: "msg msg-" + m.autor },
              criar("small", {
                text:
                  (m.autor === "equipe" ? "Restaurante" : "Você") +
                  " · " +
                  new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              }),
              criar("p", { text: m.texto })
            )
          )
        : criar("p", { class: "suave", text: "Nenhuma mensagem ainda. Fale com a equipe sobre este pedido." })
    );
    if (fim || lista.length) alvo.scrollTop = alvo.scrollHeight;
  }

  return { molde, pedido, erro, chat };
})();
