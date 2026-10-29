document.addEventListener("DOMContentLoaded", async () => {
  const { criar, achar, montar, moeda, aviso, iniciar } = Adm.tela;
  if (!iniciar("metricas", "Métricas", "Pedidos, faturamento e clientes por período.")) return;

  const PERIODOS = [["semana", "Semanal"], ["quinzena", "Quinzenal"], ["mes", "Mensal"]];
  const ROTULO = { semana: "semana", quinzena: "quinzena", mes: "mês" };
  const raiz = achar("#conteudo");
  const estado = { periodo: "semana", dados: null };

  const dia = (iso) => iso.slice(8) + "/" + iso.slice(5, 7);
  const faixa = (s) => `${dia(s.inicio)} a ${dia(s.fim)}`;
  const numero = (n) => Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

  function variacao(valor) {
    if (valor === null || valor === undefined) return criar("span", { class: "variacao", text: "sem período anterior" });
    const sinal = valor > 0 ? "+" : "";
    return criar("span", { class: "variacao " + (valor > 0 ? "sobe" : valor < 0 ? "desce" : ""), text: `${sinal}${numero(valor)}% vs. anterior` });
  }

  function cartao(rotulo, valor, extra) {
    return criar("div", { class: "kpi" },
      criar("div", { class: "rotulo", text: rotulo }),
      criar("div", { class: "valor", text: valor }),
      extra || null);
  }

  function seletor() {
    return criar("div", { class: "chips", role: "group", "aria-label": "Período" }, PERIODOS.map(([id, nome]) =>
      criar("button", {
        type: "button", class: "chip" + (estado.periodo === id ? " ativo" : ""), "aria-pressed": String(estado.periodo === id), text: nome,
        onclick: () => { estado.periodo = id; carregar(); },
      })));
  }

  function grafico(d) {
    const maior = Math.max(1, ...d.serie.map((s) => s.faturamento), d.media.faturamento);
    return criar("div", { class: "grafico", role: "img", "aria-label": "Faturamento por período" },
      criar("div", { class: "grafico-media", style: `bottom: calc(${(d.media.faturamento / maior) * 100}% * 0.78 + 26px)` },
        criar("span", { text: "média " + moeda(d.media.faturamento) })),
      d.serie.map((s) => criar("div", { class: "coluna", title: `${faixa(s)}: ${moeda(s.faturamento)} em ${s.pedidos} pedido(s)` },
        criar("span", { class: "coluna-valor", text: moeda(s.faturamento) }),
        criar("div", { class: "barra-g", style: `height: ${Math.max(2, (s.faturamento / maior) * 78)}%` }),
        criar("span", { class: "coluna-rotulo", text: dia(s.fim) }))));
  }

  function tabela(d) {
    const cab = ["Período", "Pedidos", "Faturamento bruto", "Ticket médio", "Clientes ativos", "Clientes novos", "Recorrentes"];
    const linha = (s) => criar("tr", {},
      criar("td", { text: faixa(s) }), criar("td", { text: s.pedidos }), criar("td", { text: moeda(s.faturamento) }),
      criar("td", { text: moeda(s.ticket_medio) }), criar("td", { text: s.clientes_ativos }), criar("td", { text: s.clientes_novos }),
      criar("td", { text: s.clientes_recorrentes }));
    const m = d.media;
    return criar("div", { class: "rolagem" }, criar("table", { class: "tabela" },
      criar("thead", {}, criar("tr", {}, cab.map((t) => criar("th", { text: t })))),
      criar("tbody", {},
        [...d.serie].reverse().map(linha),
        criar("tr", { class: "linha-media" },
          criar("td", { text: `Média por ${ROTULO[d.periodo]}` }), criar("td", { text: numero(m.pedidos) }), criar("td", { text: moeda(m.faturamento) }),
          criar("td", { text: moeda(m.ticket_medio) }), criar("td", { text: numero(m.clientes_ativos) }), criar("td", { text: numero(m.clientes_novos) }), criar("td", { text: "—" })))));
  }

  function recorrencia(d) {
    const r = d.recorrencia;
    const maior = Math.max(1, ...r.faixas.map((f) => f.clientes));
    return criar("div", { class: "duas-colunas" },
      criar("div", { class: "painel" },
        criar("div", { class: "painel-topo" }, criar("h3", { text: "Recorrência de pedidos" })),
        criar("p", { text: r.clientes_com_pedido ? `${r.clientes_recorrentes} de ${r.clientes_com_pedido} clientes (${numero(r.taxa)}%) já pediram mais de uma vez.` : "Ainda não há pedidos." }),
        criar("div", { class: "barras-h espaco-cima" }, r.faixas.map((f) => criar("div", { class: "barra-h" },
          criar("span", { class: "barra-h-rotulo", text: f.faixa }),
          criar("div", { class: "barra-h-trilho" }, criar("div", { class: "barra-h-valor", style: `width: ${(f.clientes / maior) * 100}%` })),
          criar("strong", { text: f.clientes }))))),
      criar("div", { class: "painel" },
        criar("div", { class: "painel-topo" }, criar("h3", { text: "Clientes mais frequentes" })),
        d.mais_frequentes.length
          ? criar("table", { class: "tabela" },
              criar("thead", {}, criar("tr", {}, ["Cliente", "Pedidos", "Total", "Último"].map((t) => criar("th", { text: t })))),
              criar("tbody", {}, d.mais_frequentes.map((c) => criar("tr", {},
                criar("td", { text: c.nome }), criar("td", { text: c.pedidos }), criar("td", { text: moeda(c.total) }), criar("td", { text: dia(c.ultimo) })))))
          : criar("p", { class: "vazio", text: "Sem pedidos no período." })));
  }

  function baixarCsv(d) {
    const num = (n) => String(n).replace(".", ",");
    const linhas = [
      ["Período", "Início", "Fim", "Pedidos", "Faturamento bruto", "Ticket médio", "Clientes ativos", "Clientes novos", "Clientes recorrentes"],
      ...d.serie.map((s) => [ROTULO[d.periodo], s.inicio, s.fim, s.pedidos, num(s.faturamento.toFixed(2)), num(s.ticket_medio.toFixed(2)), s.clientes_ativos, s.clientes_novos, s.clientes_recorrentes]),
      ["Média", "", "", num(d.media.pedidos), num(d.media.faturamento.toFixed(2)), num(d.media.ticket_medio.toFixed(2)), num(d.media.clientes_ativos), num(d.media.clientes_novos), ""],
    ];
    const texto = "﻿" + linhas.map((l) => l.join(";")).join("\r\n");
    const link = criar("a", { href: URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" })), download: `metricas-${d.periodo}-${d.hoje}.csv` });
    document.body.append(link);
    link.click();
    link.remove();
    aviso("Relatório baixado.");
  }

  function desenhar(d) {
    const a = d.resumo.atual;
    const v = d.resumo.variacao || {};
    montar(raiz,
      criar("div", { class: "barra-topo-metricas" },
        seletor(),
        criar("button", { type: "button", class: "botao botao-contorno", text: "Baixar relatório (CSV)", onclick: () => baixarCsv(d) })),
      criar("p", { class: "suave periodo-atual", text: `Período atual: ${faixa(a)} (${d.dias} dias terminando hoje).` }),
      criar("div", { class: "kpis kpis-6" },
        cartao("Pedidos", a.pedidos, variacao(v.pedidos)),
        cartao("Faturamento bruto", moeda(a.faturamento), variacao(v.faturamento)),
        cartao("Ticket médio", moeda(a.ticket_medio), variacao(v.ticket_medio)),
        cartao("Clientes ativos", a.clientes_ativos, variacao(v.clientes_ativos)),
        cartao("Clientes novos", a.clientes_novos, criar("span", { class: "variacao", text: "cadastros no período" })),
        cartao("Clientes recorrentes", a.clientes_recorrentes, criar("span", { class: "variacao", text: "2 ou mais pedidos no período" }))),
      criar("div", { class: "painel" },
        criar("div", { class: "painel-topo" }, criar("h3", { text: "Faturamento por " + ROTULO[d.periodo] })),
        grafico(d)),
      criar("div", { class: "painel" },
        criar("div", { class: "painel-topo" }, criar("h3", { text: "Pedidos e clientes por período" })),
        tabela(d)),
      recorrencia(d),
      criar("p", { class: "suave nota-metricas", text: "Contam os pedidos aceitos (os recusados e cancelados ficam de fora). Faturamento bruto é a soma dos totais, incluindo taxa de entrega. Clientes ativos fizeram ao menos um pedido no período; novos são os cadastros do período." }));
  }

  async function carregar() {
    try {
      estado.dados = await Adm.api.metricas(estado.periodo);
      desenhar(estado.dados);
    } catch (falha) {
      if (!estado.dados) montar(raiz, criar("p", { class: "msg-erro", text: falha.message }));
      else aviso(falha.message, "erro");
    }
  }

  await carregar();
  setInterval(() => { if (!document.hidden) carregar(); }, 60000);
  Adm.api.tempoReal((ev) => { if (ev.tipo === "novo" || ev.tipo === "pedido") carregar(); });
});
