Adm.controle = Adm.controle || {};

Adm.controle.cardapio = {
  async montar() {
    const { achar } = Dom;
    const { tentar } = Adm.app;
    const { marcadosDe } = Adm.visao.base;
    const campoData = Adm.visao.cardapio.campoData();
    if (!Adm.app.iniciar("cardapio", "Cardápio do Dia", "Marque os tipos e produtos do dia e publique para os clientes.", campoData))
      return;

    const raiz = achar("#conteudo");
    let tipos = [];
    let produtos = [];
    let dia = null;

    try {
      [tipos, produtos] = await Promise.all([Adm.api.tipos.listar(), Adm.api.produtos.listar()]);
      dia = await Adm.api.cardapioDia.hoje();
    } catch (falha) {
      return Adm.visao.base.erro(raiz, falha.message);
    }
    campoData.value = dia.data;

    const acoes = { salvar, publicar, copiar };
    const desenhar = () => Adm.visao.cardapio.tela(raiz, { tipos, produtos, dia }, acoes);
    const selecao = () => ({ tipo_ids: marcadosDe(achar("#marcar-tipos")), produto_ids: marcadosDe(achar("#marcar-produtos")) });

    function atualizarDia(r) {
      if (r && r !== true) {
        dia = r;
        desenhar();
      }
    }

    async function salvar() {
      const r = await tentar(() => Adm.api.cardapioDia.salvar(campoData.value, selecao()), "Seleção salva.");
      atualizarDia(r);
      return !!r;
    }

    async function copiar() {
      const r = await tentar(() => Adm.api.cardapioDia.copiar(campoData.value));
      if (!r) return;
      atualizarDia(r);
      Dom.aviso(`Copiado do cardápio de ${r.copiado_de.split("-").reverse().join("/")}. Revise e publique.`, "ok");
    }

    async function publicar(valor) {
      if (valor && !(await salvar())) return;
      atualizarDia(
        await tentar(() => Adm.api.cardapioDia.publicar(campoData.value, valor), valor ? "Cardápio publicado!" : "Cardápio despublicado.")
      );
    }

    campoData.addEventListener("change", async () => {
      if (campoData.value) atualizarDia(await tentar(() => Adm.api.cardapioDia.ver(campoData.value)));
    });

    desenhar();
  },
};
