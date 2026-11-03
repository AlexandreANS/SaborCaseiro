Sabor.controle.pedidos = {
  titulo: "Meus Pedidos",
  ativa: "pedidos",
  exigeLogin: true,
  async montar(raiz, params) {
    const visao = Sabor.visao.pedidos;
    Sabor.visao.base.desenhar(raiz, visao.molde);
    const FINAIS = ["Concluído", "Cancelado"];
    const PASSO = 20;
    let assinatura = "";
    let limite = PASSO;

    function maisPedidos() {
      limite += PASSO;
      assinatura = "";
      carregar();
    }

    async function carregar() {
      try {
        const pedidos = await Sabor.api.pedidos(limite);
        const nova = JSON.stringify(pedidos.map((p) => [p.id, p.status, p.total_msgs]));
        if (nova === assinatura) return;
        assinatura = nova;
        visao.lista(
          raiz,
          pedidos.map((p) => ({ ...p, final: FINAIS.includes(p.status) })),
          {
            repetir: Sabor.app.repetirPedido,
            temMais: pedidos.length >= limite,
            maisPedidos,
          }
        );
      } catch (falha) {
        if (falha.status === 401) return Sabor.app.exigirLogin();
        if (assinatura) return;
        visao.erro(raiz, falha.message, () => Sabor.rota.abrir());
      }
    }

    await carregar();
    Sabor.rota.repetir(carregar, 20000);
    Sabor.rota.ouvir("/pedidos/eventos", () => carregar());
  },
};
