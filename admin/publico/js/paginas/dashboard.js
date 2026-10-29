document.addEventListener("DOMContentLoaded", async () => {
  const { criar, achar, montar, moeda, iniciar, SELO } = Adm.tela;
  if (!iniciar("dashboard", "Resumo do Dia", "Visão rápida dos pedidos de hoje.")) return;

  const alvo = achar("#conteudo");
  async function carregar() {
    try {
      const [lista, cardapio, contagem, metricas] = await Promise.all([
        Adm.api.pedidos("", 6), Adm.api.cardapioDia.hoje(), Adm.api.contagem(), Adm.api.metricas("semana"),
      ]);
      const kpi = (rotulo, valor) => criar("div", { class: "kpi" }, criar("div", { class: "rotulo", text: rotulo }), criar("div", { class: "valor", text: valor }));

      montar(alvo,
        criar("div", { class: "kpis" },
          kpi("Pedidos hoje", metricas.hoje_resumo.pedidos),
          kpi("Aguardando", contagem.Esperando),
          kpi("Em andamento", contagem.Preparando + contagem["Saiu para Entrega"] + contagem["Pronto para Retirada"]),
          kpi("Faturamento hoje", moeda(metricas.hoje_resumo.faturamento))),
        criar("div", { class: "painel" },
          criar("div", { class: "painel-topo" },
            criar("h3", { text: "Cardápio de hoje" }),
            criar("a", { href: "cardapio.html", class: "botao botao-contorno botao-p", text: "Gerenciar" })),
          criar("span", { class: "selo " + (cardapio.publicado ? "selo-ok" : "selo-perigo"), text: cardapio.publicado ? "Publicado" : "Não publicado" }),
          criar("p", { class: "espaco-cima", text: `${cardapio.tipo_ids.length} tipos e ${cardapio.produto_ids.length} produtos selecionados.` })),
        criar("div", { class: "painel" },
          criar("div", { class: "painel-topo" },
            criar("h3", { text: "Últimos pedidos" }),
            criar("a", { href: "pedidos.html", class: "botao botao-contorno botao-p", text: "Ver todos" })),
          lista.length
            ? criar("table", { class: "tabela" },
                criar("thead", {}, criar("tr", {}, ["Pedido", "Cliente", "Itens", "Total", "Status"].map((t) => criar("th", { text: t })))),
                criar("tbody", {}, lista.map((p) => criar("tr", {},
                  criar("td", { class: "link-linha", text: "#" + p.id }), criar("td", { text: p.nome_cliente }),
                  criar("td", { text: p.resumo || "—" }), criar("td", { text: moeda(p.total) }),
                  criar("td", {}, criar("span", { class: "selo " + SELO[p.status], text: p.status_rotulo }))))))
            : criar("p", { text: "Nenhum pedido ainda." })));
    } catch (falha) {
      montar(alvo, criar("p", { class: "msg-erro", text: falha.message }));
    }
  }

  await carregar();
  setInterval(() => { if (!document.hidden) carregar(); }, 30000);
  Adm.api.tempoReal(() => carregar());
});
