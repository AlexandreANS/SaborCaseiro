Adm.controle = Adm.controle || {};

Adm.controle.dashboard = {
  async montar() {
    if (!Adm.app.iniciar("dashboard", "Resumo do Dia", "Visão rápida dos pedidos de hoje.")) return;
    const alvo = Dom.achar("#conteudo");

    async function carregar() {
      try {
        const [lista, cardapio, contagem, metricas] = await Promise.all([
          Adm.api.pedidos("", 6),
          Adm.api.cardapioDia.hoje(),
          Adm.api.contagem(),
          Adm.api.metricas("semana"),
        ]);
        Adm.visao.dashboard.tela(alvo, { lista, cardapio, contagem, metricas });
      } catch (falha) {
        Adm.visao.base.erro(alvo, falha.message);
      }
    }

    await carregar();
    Adm.app.repetir(carregar, 30000);
    Adm.api.tempoReal(() => carregar());
  },
};
