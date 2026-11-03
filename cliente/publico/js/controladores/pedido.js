Sabor.controle.pedido = {
  titulo: "Seu Pedido",
  ativa: "carrinho",
  exigeLogin: true,
  async montar(raiz, params) {
    const { aviso, achar } = Dom;
    const visao = Sabor.visao.pedido;
    Sabor.visao.base.desenhar(raiz, visao.molde);

    const loja = (await Sabor.app.loja()) || {};
    const id = params.get("id");
    const FINAIS = ["Concluído", "Cancelado"];
    const chat = achar("#chat", raiz);
    const formChat = achar("#chat-form", raiz);
    let statusAnterior = null;
    let pedidoAtual = null;
    let totalMsgs = -1;

    function desenhar(pedido) {
      visao.pedido(raiz, pedido, loja, { cancelar, repetir: Sabor.app.repetirPedido, final: FINAIS.includes(pedido.status) });
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

    async function carregarChat() {
      try {
        const lista = await Sabor.api.mensagens(id);
        if (lista.length === totalMsgs) return;
        totalMsgs = lista.length;
        visao.chat(raiz, lista);
      } catch {}
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
          if (statusAnterior !== null && statusAnterior !== pedido.status)
            aviso("Seu pedido agora está: " + pedido.status_rotulo, pedido.status === "Cancelado" ? "erro" : "ok");
          statusAnterior = pedido.status;
          desenhar(pedido);
        }
        chat.hidden = false;
        await carregarChat();
      } catch (falha) {
        if (falha.status === 401) return Sabor.app.exigirLogin();
        if (!pedidoAtual) visao.erro(raiz, falha.message);
      }
    }

    if (!id) return Sabor.rota.ir("/home", true);
    await carregar();
    Sabor.rota.repetir(carregar, 20000);
    Sabor.rota.ouvir("/pedidos/eventos", (ev) => {
      if (!ev.id || String(ev.id) === String(id)) carregar();
    });
  },
};
