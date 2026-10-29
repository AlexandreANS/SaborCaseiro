Sabor.telas.pedido = {
  titulo: "Seu Pedido",
  ativa: "carrinho",
  exigeLogin: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<main class="conteudo">
  <div class="confirmacao" id="confirmacao" aria-live="polite">
    <p class="suave">Carregando pedido...</p>
  </div>

  <section class="chat" id="chat" hidden>
    <h3>Fale com a equipe</h3>
    <div class="chat-lista" id="chat-lista" aria-live="polite"></div>
    <form class="chat-form" id="chat-form">
      <input type="text" name="texto" maxlength="500" placeholder="Escreva sua mensagem" autocomplete="off" aria-label="Mensagem">
      <button type="submit" class="botao botao-principal">Enviar</button>
    </form>
  </section>
</main>
`);
    const { criar, achar, montar, moeda, aviso, exigirLogin } = Sabor.tela;

    const caixa = achar("#confirmacao", raiz);
    const loja = (await Sabor.tela.loja()) || {};
    const id = params.get("id");
    const FINAIS = ["Concluído", "Cancelado"];
    let statusAnterior = null;
    let pedidoAtual = null;

    function textos(pedido) {
      const entrega = pedido.tipo_entrega === "entrega";
      const n = pedido.id;
      return {
        Esperando: ["Aguardando confirmação", `Seu pedido #${n} foi enviado e está aguardando o restaurante aceitar. Esta tela atualiza sozinha.`],
        Preparando: ["Pedido aceito!", `O restaurante aceitou o pedido #${n} e já está preparando.`],
        "Saiu para Entrega": ["Saiu para entrega", `O pedido #${n} está a caminho do seu endereço.`],
        "Pronto para Retirada": ["Pronto para retirada", `O pedido #${n} está pronto no balcão.`],
        Concluído: [entrega ? "Pedido entregue!" : "Pedido retirado!", `O pedido #${n} foi ${entrega ? "entregue" : "retirado"}. Bom apetite!`],
        Cancelado: pedido.cancelado_por === "cliente"
          ? ["Pedido cancelado", `Você cancelou o pedido #${n}.`]
          : ["Pedido recusado", `O restaurante não pôde aceitar o pedido #${n}.`],
      }[pedido.status];
    }

    function desenhar(pedido) {
      const lista = pedido.passos;
      const pos = lista.findIndex((e) => e.status === pedido.status);
      const cancelado = pedido.status === "Cancelado";
      const aguardando = pedido.status === "Esperando";
      const entrega = pedido.tipo_entrega === "entrega";
      const pagamento = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro" }[pedido.forma_pagamento];
      const [titulo, frase] = textos(pedido);

      montar(caixa,
        criar("div", { class: "confirma-icone" + (cancelado ? " cancelado" : aguardando ? " aguardando" : ""), text: cancelado ? "✕" : aguardando ? "⏳" : "✓" }),
        criar("h2", { text: titulo }),
        criar("p", { text: frase }),
        cancelado && pedido.motivo_recusa ? criar("p", { class: "motivo-recusa" }, criar("strong", { text: "Motivo: " }), pedido.motivo_recusa) : null,
        cancelado ? null : criar("div", { class: "etapas-status", role: "list", "aria-label": "Status do pedido" },
          lista.map((e, i) => criar("div", { class: "etapa-status" + (i < pos ? " feito" : i === pos ? " ativo" : ""), role: "listitem", text: e.rotulo }))),
        criar("div", { class: "confirma-detalhes" },
          criar("h4", { text: "Itens do Pedido" }),
          criar("ul", { class: "resumo-lista" }, pedido.itens.map((i) => criar("li", {},
            criar("span", { text: `${i.quantidade}x ${i.tipo_nome}` }),
            criar("span", { text: moeda(i.preco_unitario * i.quantidade) })))),
          pedido.desconto > 0 ? criar("p", { text: `Desconto (${pedido.cupom}): – ${moeda(pedido.desconto)}` }) : null,
          entrega ? criar("p", { text: `Taxa de entrega: ${moeda(pedido.taxa_entrega)}` }) : null,
          criar("p", {}, criar("strong", { text: "Total: " + moeda(pedido.total) })),
          criar("h4", { text: entrega ? "Endereço de Entrega" : "Retirada no Balcão" }),
          entrega
            ? criar("p", {}, `${pedido.rua}, ${pedido.numero}${pedido.complemento ? " - " + pedido.complemento : ""}`, criar("br"), `${pedido.bairro_nome}, São Paulo - SP${pedido.cep ? " | CEP: " + pedido.cep : ""}`)
            : criar("p", { text: loja.endereco || "" }),
          criar("h4", { text: "Pagamento & Prazo" }),
          criar("p", {}, criar("span", { class: "selo selo-aviso", text: pagamento + " (na " + (entrega ? "entrega" : "retirada") + ")" }),
            " · Previsão: ", pedido.horario_agendado ? "agendado para " + pedido.horario_agendado : (entrega ? loja.prazo_entrega : loja.prazo_retirada) || "—"),
          pedido.observacoes ? criar("p", { class: "obs", text: "Obs: " + pedido.observacoes }) : null),
        aguardando ? criar("button", { type: "button", class: "botao botao-cancelar botao-cheio espaco-baixo", onclick: cancelar, text: "Cancelar pedido" }) : null,
        loja.telefone ? criar("a", { href: "tel:+55" + loja.telefone.replace(/\D/g, ""), class: "botao botao-contorno botao-cheio espaco-baixo", text: "Falar com o restaurante" }) : null,
        criar("a", { href: "#/pedidos", class: "botao botao-leve botao-cheio espaco-baixo", text: "Ver meus pedidos" }),
        FINAIS.includes(pedido.status) ? criar("button", { type: "button", class: "botao botao-principal botao-cheio espaco-baixo", onclick: () => Sabor.tela.repetirPedido(pedido.id), text: "Pedir de novo" }) : null,
        criar("a", { href: "#/montar", class: "botao botao-leve botao-cheio", text: "Voltar ao Cardápio" }));

    }

    async function cancelar() {
      if (!confirm("Cancelar este pedido? O restaurante ainda não aceitou.")) return;
      try {
        pedidoAtual = await Sabor.api.cancelarPedido(id);
        statusAnterior = pedidoAtual.status;
        desenhar(pedidoAtual);
        aviso("Pedido cancelado.", "ok");
        carregarChat();
      } catch (falha) {
        aviso(falha.message, "erro");
        carregar();
      }
    }

    const chat = achar("#chat", raiz);
    const listaChat = achar("#chat-lista", raiz);
    const formChat = achar("#chat-form", raiz);
    let totalMsgs = -1;

    function desenharChat(lista) {
      if (lista.length === totalMsgs) return;
      totalMsgs = lista.length;
      const fim = listaChat.scrollTop + listaChat.clientHeight >= listaChat.scrollHeight - 30;
      montar(listaChat, lista.length
        ? lista.map((m) => criar("div", { class: "msg msg-" + m.autor },
            criar("small", { text: (m.autor === "equipe" ? "Restaurante" : "Você") + " · " + new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }),
            criar("p", { text: m.texto })))
        : criar("p", { class: "suave", text: "Nenhuma mensagem ainda. Fale com a equipe sobre este pedido." }));
      if (fim || totalMsgs === lista.length) listaChat.scrollTop = listaChat.scrollHeight;
    }

    async function carregarChat() {
      try { desenharChat(await Sabor.api.mensagens(id)); } catch {}
    }

    formChat.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const campo = formChat.elements.texto;
      const texto = campo.value.trim();
      if (!texto) return;
      campo.disabled = true;
      try {
        await Sabor.api.enviarMensagem(id, texto);
        campo.value = "";
        await carregarChat();
      } catch (falha) {
        aviso(falha.message, "erro");
      }
      campo.disabled = false;
      campo.focus();
    });

    async function carregar() {
      try {
        if (!pedidoAtual || !FINAIS.includes(pedidoAtual.status)) {
          const pedido = await Sabor.api.pedido(id);
          pedidoAtual = pedido;
          if (statusAnterior !== null && statusAnterior !== pedido.status) aviso("Seu pedido agora está: " + pedido.status_rotulo, pedido.status === "Cancelado" ? "erro" : "ok");
          statusAnterior = pedido.status;
          desenhar(pedido);
        }
        chat.hidden = false;
        await carregarChat();
      } catch (falha) {
        if (falha.status === 401) return exigirLogin();
        if (pedidoAtual) return;
        montar(caixa,
          criar("h2", { text: "Não foi possível abrir o pedido" }),
          criar("p", { class: "msg-erro", text: falha.message }),
          criar("a", { href: "#/home", class: "botao botao-principal", text: "Ir para o início" }));
      }
    }

    if (!id) {
      Sabor.rota.ir("/home", true);
      return;
    }
    await carregar();
    Sabor.rota.repetir(carregar, 20000);
    Sabor.rota.ouvir("/pedidos/eventos", (ev) => { if (!ev.id || String(ev.id) === String(id)) carregar(); });
  },
};
