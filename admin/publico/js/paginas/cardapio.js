document.addEventListener("DOMContentLoaded", async () => {
  const { criar, achar, montar, tentar, iniciar, caixas, marcadosDe } = Adm.tela;
  const campoData = criar("input", { type: "date", class: "busca", id: "data", "aria-label": "Data do cardápio" });
  if (!iniciar("cardapio", "Cardápio do Dia", "Marque os tipos e produtos do dia e publique para os clientes.", campoData)) return;

  const raiz = achar("#conteudo");
  let tipos = [];
  let produtos = [];
  let dia = null;

  try {
    [tipos, produtos] = await Promise.all([Adm.api.tipos.listar(), Adm.api.produtos.listar()]);
    dia = await Adm.api.cardapioDia.hoje();
  } catch (falha) {
    montar(raiz, criar("p", { class: "msg-erro", text: falha.message }));
    return;
  }
  campoData.value = dia.data;

  function desenhar() {
    const tiposAtivos = tipos.filter((t) => t.ativo);
    const marcadosTipos = new Set(dia.tipo_ids);
    const marcadosProdutos = new Set(dia.produto_ids);
    const gradeTipos = criar("div", { class: "grade-checks", id: "marcar-tipos" }, tiposAtivos.map((t) =>
      criar("label", { class: "check" }, criar("input", { type: "checkbox", value: t.id, checked: marcadosTipos.has(t.id) }), criar("span", { text: `${t.nome} — R$ ${t.preco.toFixed(2).replace(".", ",")}` }))));
    const blocoProdutos = criar("div", { id: "marcar-produtos" }, caixas(produtos.filter((p) => p.ativo), marcadosProdutos));

    montar(raiz,
      criar("div", { class: "painel" },
        criar("div", { class: "painel-topo" },
          criar("h3", { text: "Situação" }),
          criar("span", { class: "selo " + (dia.publicado ? "selo-ok" : "selo-perigo"), text: dia.publicado ? "Publicado" : "Não publicado" })),
        criar("p", { text: "Só o que estiver marcado e publicado aparece para os clientes montarem as marmitas." }),
        criar("div", { class: "botoes espaco-cima" },
          criar("button", { class: "botao botao-contorno", text: "Salvar seleção", onclick: salvar }),
          dia.publicado
            ? criar("button", { class: "botao botao-perigo", text: "Despublicar", onclick: () => publicar(false) })
            : criar("button", { class: "botao botao-principal", text: "Salvar e publicar", onclick: () => publicar(true) }))),
      criar("div", { class: "painel" }, criar("div", { class: "painel-topo" }, criar("h3", { text: "Tipos de marmita do dia" })),
        tiposAtivos.length ? gradeTipos : criar("p", { text: "Cadastre tipos de marmita na tela de Tipos." })),
      criar("div", { class: "painel" }, criar("div", { class: "painel-topo" }, criar("h3", { text: "Produtos do dia" })), blocoProdutos));
  }

  function selecao() {
    return { tipo_ids: marcadosDe(achar("#marcar-tipos")), produto_ids: marcadosDe(achar("#marcar-produtos")) };
  }

  async function salvar() {
    const r = await tentar(() => Adm.api.cardapioDia.salvar(campoData.value, selecao()), "Seleção salva.");
    if (r && r !== true) { dia = r; desenhar(); }
    return !!r;
  }

  async function publicar(valor) {
    if (valor && !(await salvar())) return;
    const r = await tentar(() => Adm.api.cardapioDia.publicar(campoData.value, valor), valor ? "Cardápio publicado!" : "Cardápio despublicado.");
    if (r && r !== true) { dia = r; desenhar(); }
  }

  campoData.addEventListener("change", async () => {
    if (!campoData.value) return;
    const r = await tentar(() => Adm.api.cardapioDia.ver(campoData.value));
    if (r && r !== true) { dia = r; desenhar(); }
  });

  desenhar();
});
