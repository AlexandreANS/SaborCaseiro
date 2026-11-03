Adm.controle = Adm.controle || {};

Adm.controle.metricas = {
  async montar() {
    if (!Adm.app.iniciar("metricas", "Métricas", "Pedidos, faturamento e clientes por período.")) return;
    const raiz = Dom.achar("#conteudo");
    const estado = { periodo: "semana", dados: null };

    async function carregar() {
      try {
        estado.dados = await Adm.api.metricas(estado.periodo);
        Adm.visao.metricas.tela(raiz, estado.dados, estado, {
          periodo: (id) => {
            estado.periodo = id;
            carregar();
          },
        });
      } catch (falha) {
        if (!estado.dados) Adm.visao.base.erro(raiz, falha.message);
        else Dom.aviso(falha.message, "erro");
      }
    }

    await carregar();
    Adm.app.repetir(carregar, 60000);
    Adm.api.tempoReal((ev) => {
      if (ev.tipo === "novo" || ev.tipo === "pedido") carregar();
    });
  },
};
