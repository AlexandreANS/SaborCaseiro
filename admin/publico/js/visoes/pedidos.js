window.Adm = window.Adm || {};
Adm.visao = Adm.visao || {};

Adm.visao.pedidos = (function () {
  const { criar, achar, montar, moeda, aviso } = Dom;
  const { FORMAS, SELO, cabecalhoTabela } = Adm.visao.base;

  const FILTROS = [
    ["", "Todos"],
    ["Esperando", "Aguardando aceite"],
    ["Preparando", "Preparando"],
    ["Saiu para Entrega", "Saiu para entrega"],
    ["Pronto para Retirada", "Pronto para retirada"],
    ["Concluído", "Concluídos"],
    ["Cancelado", "Recusados"],
  ];

  const enderecoDe = (p) => `${p.rua}, ${p.numero}${p.complemento ? " - " + p.complemento : ""} · ${p.bairro_nome || ""}`;
  const pagamentoDe = (p) => FORMAS[p.forma_pagamento] + (p.troco_para ? ` (troco para ${moeda(p.troco_para)})` : "");
  const ingredientesDe = (i) => i.ingredientes.map((g) => g.nome + (g.adicional ? " (adicional)" : "")).join(", ");

  function casca(raiz) {
    const lista = criar("div", { class: "painel" });
    const detalhe = criar("div", { class: "detalhe" });
    montar(raiz, criar("div", { class: "duas-colunas" }, lista, detalhe));
    return { lista, detalhe };
  }

  function chips(d, acoes) {
    return criar(
      "div",
      { class: "chips" },
      FILTROS.map(([valor, rotulo]) => {
        const n = d.contagem ? (valor ? d.contagem[valor] : d.contagem.total) : 0;
        return criar("button", {
          type: "button",
          class: "chip" + (d.filtro === valor ? " ativo" : "") + (valor === "Esperando" && n ? " chip-alerta" : ""),
          text: `${rotulo} (${n})`,
          onclick: () => acoes.filtrar(valor),
        });
      })
    );
  }

  function parar(acao) {
    return (ev) => {
      ev.stopPropagation();
      acao();
    };
  }

  function passoRapido(p, acoes) {
    if (!p.proxima) return "—";
    return [
      criar("button", {
        type: "button",
        class: "botao botao-p " + (p.status === "Esperando" ? "botao-ok" : "botao-principal"),
        text: p.proxima.curto,
        onclick: parar(() => acoes.avancar(p)),
      }),
      p.status === "Esperando"
        ? criar("button", {
            type: "button",
            class: "botao botao-p botao-contorno-perigo",
            text: "Recusar",
            onclick: parar(() => acoes.recusarRapido(p.id)),
          })
        : null,
    ];
  }

  function lista(alvo, d, acoes) {
    montar(
      alvo,
      criar(
        "div",
        { class: "painel-topo" },
        criar("h2", { text: "Pedidos" }),
        criar("button", {
          type: "button",
          class: "botao botao-contorno botao-p",
          id: "botao-som",
          "aria-pressed": String(d.som),
          text: d.som ? "🔔 Avisos ligados" : "🔕 Avisos desligados",
          onclick: acoes.alternarSom,
        })
      ),
      chips(d, acoes),
      d.pedidos.length
        ? criar(
            "table",
            { class: "tabela espaco-cima" },
            cabecalhoTabela(["Pedido", "Cliente", "Itens", "Total", "Status", "Próximo passo"]),
            criar(
              "tbody",
              {},
              d.pedidos.map((p) =>
                criar(
                  "tr",
                  {
                    class: "linha-clicavel" + (d.aberto === p.id ? " ativa" : ""),
                    "data-id": p.id,
                    onclick: () => acoes.abrir(p.id),
                  },
                  criar("td", { class: "link-linha", text: "#" + p.id }),
                  criar("td", { text: p.nome_cliente }),
                  criar("td", { text: p.resumo || "—" }),
                  criar("td", { text: moeda(p.total) }),
                  criar("td", {}, criar("span", { class: "selo " + SELO[p.status], text: p.status_rotulo })),
                  criar("td", { class: "celula-acao" }, passoRapido(p, acoes))
                )
              )
            )
          )
        : criar("p", { class: "vazio", text: "Nenhum pedido neste filtro." }),
      d.pedidos.length >= d.limite
        ? criar("button", { type: "button", class: "botao botao-contorno espaco-cima", text: "Carregar mais pedidos", onclick: acoes.mais })
        : null
    );
  }

  const linha = (rotulo, valor) => criar("div", { class: "linha-info" }, criar("span", { text: rotulo }), criar("strong", { text: valor }));

  function etapas(p) {
    const pos = p.passos.findIndex((e) => e.status === p.status);
    const encerrado = p.status === "Concluído";
    return criar(
      "div",
      { class: "etapas-gerente", role: "list", "aria-label": "Andamento do pedido" },
      p.passos.map((e, i) =>
        criar("div", {
          class: "etapa-g" + (i < pos || encerrado ? " feita" : i === pos ? " atual" : i === pos + 1 ? " proxima" : ""),
          role: "listitem",
          text: (i < pos || encerrado ? "✓ " : "") + e.rotulo,
        })
      )
    );
  }

  function formularioRecusa(p, d, acoes) {
    const escolha = criar(
      "select",
      { id: "recusa-modelo" },
      criar("option", { value: "", text: "Escolha uma mensagem pronta..." }),
      d.recusas.map((r) => criar("option", { value: r.id, text: r.texto })),
      criar("option", { value: "outro", text: "Outro motivo..." })
    );
    const livre = criar("input", { type: "text", id: "recusa-livre", maxlength: "300", placeholder: "Escreva o motivo", hidden: true });
    escolha.addEventListener("change", () => {
      livre.hidden = escolha.value !== "outro";
    });
    return criar(
      "div",
      { class: "painel-recusa" },
      criar("h3", { text: "Recusar pedido #" + p.id }),
      criar("p", { text: "O cliente verá o motivo escolhido abaixo." }),
      escolha,
      livre,
      criar(
        "div",
        { class: "botoes" },
        criar("button", {
          class: "botao botao-perigo",
          text: "Confirmar recusa",
          onclick: () => {
            if (!escolha.value) return aviso("Escolha o motivo da recusa.", "erro");
            acoes.recusar(p.id, escolha.value === "outro" ? { motivo: livre.value } : { mensagem_id: Number(escolha.value) });
          },
        }),
        criar("button", { class: "botao botao-contorno", text: "Voltar", onclick: acoes.cancelarRecusa })
      )
    );
  }

  function acaoDoPedido(p, d, acoes) {
    if (p.status === "Cancelado") {
      if (p.cancelado_por === "cliente") return criar("p", { class: "encerrado", text: "Pedido cancelado pelo cliente antes do aceite." });
      return p.motivo_recusa ? criar("p", { class: "motivo-recusa", text: "Motivo da recusa: " + p.motivo_recusa }) : null;
    }
    if (!p.proxima) return criar("p", { class: "encerrado", text: "Pedido " + p.status_rotulo.toLowerCase() + ". Nada mais a fazer." });
    if (p.status === "Esperando" && d.recusando === p.id) return formularioRecusa(p, d, acoes);
    if (p.status === "Esperando") {
      return criar(
        "div",
        { class: "decisao" },
        criar("button", { class: "botao botao-ok acao-grande", text: "✓ " + p.proxima.texto, onclick: () => acoes.aceitar(p.id) }),
        criar("button", {
          class: "botao botao-contorno-perigo acao-grande",
          text: "Recusar pedido",
          onclick: () => acoes.iniciarRecusa(p.id),
        })
      );
    }
    return criar(
      "div",
      { class: "proximo-passo" },
      criar("button", {
        class: "botao botao-principal acao-grande",
        text: p.proxima.texto,
        onclick: () => acoes.status(p.id, p.proxima.status),
      }),
      p.anterior
        ? criar("button", {
            type: "button",
            class: "voltar-etapa",
            text: "↩ " + p.anterior.texto,
            onclick: () => acoes.status(p.id, p.anterior.status),
          })
        : null
    );
  }

  function mensagensDe(lista, p) {
    return lista.length
      ? lista.map((m) =>
          criar(
            "div",
            { class: "msg msg-" + m.autor },
            criar("small", {
              text:
                (m.autor === "equipe" ? "Equipe" : p.nome_cliente) +
                " · " +
                new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            }),
            criar("p", { text: m.texto })
          )
        )
      : criar("p", { class: "suave", text: "Sem mensagens." });
  }

  function mensagens(lista, p, descer = false) {
    const caixa = achar("#chat-lista");
    if (!caixa) return;
    const noFim = caixa.scrollTop + caixa.clientHeight >= caixa.scrollHeight - 30;
    montar(caixa, mensagensDe(lista, p));
    if (noFim || descer) caixa.scrollTop = caixa.scrollHeight;
  }

  function blocoChat(p, acoes) {
    const caixa = criar("div", { class: "chat-lista", id: "chat-lista" }, mensagensDe(p.mensagens, p));
    const campo = criar("input", { type: "text", maxlength: "500", placeholder: "Mensagem para o cliente", "aria-label": "Mensagem" });
    const form = criar(
      "form",
      {
        class: "chat-form",
        onsubmit: async (ev) => {
          ev.preventDefault();
          const texto = campo.value.trim();
          if (texto && (await acoes.enviar(p, texto))) campo.value = "";
        },
      },
      campo,
      criar("button", { type: "submit", class: "botao botao-principal", text: "Enviar" })
    );
    setTimeout(() => {
      caixa.scrollTop = caixa.scrollHeight;
    });
    return criar("div", { class: "chat" }, criar("h3", { text: "Conversa com o cliente" }), caixa, form);
  }

  function detalhe(alvo, p, d, acoes) {
    const entrega = p.tipo_entrega === "entrega";
    montar(
      alvo,
      criar(
        "div",
        { class: "painel" },
        criar(
          "div",
          { class: "painel-topo" },
          criar("h2", { text: "Pedido #" + p.id }),
          criar(
            "div",
            { class: "topo-acoes" },
            criar("button", {
              type: "button",
              class: "botao botao-contorno botao-p",
              id: "botao-imprimir",
              text: "🖨 Imprimir comanda",
              onclick: () => comanda(p),
            }),
            criar("span", { class: "selo " + SELO[p.status], text: p.status_rotulo })
          )
        ),
        p.status === "Cancelado" ? null : etapas(p),
        acaoDoPedido(p, d, acoes),
        linha("Cliente", `${p.nome_cliente} · ${p.telefone}`),
        linha("Recebimento", entrega ? "Entrega" : "Retirada no local"),
        entrega ? linha("Endereço", enderecoDe(p)) : null,
        linha("Pagamento", pagamentoDe(p)),
        p.horario_agendado ? linha("Horário agendado", p.horario_agendado) : null,
        p.observacoes ? linha("Observações", p.observacoes) : null,
        criar("h3", { class: "espaco-cima", text: "Itens" }),
        criar(
          "ul",
          { class: "itens-pedido" },
          p.itens.map((i) =>
            criar(
              "li",
              {},
              criar(
                "div",
                { class: "item-topo" },
                criar("strong", { text: `${i.quantidade}x ${i.tipo_nome}` + (i.extra ? " (extra)" : "") }),
                criar("span", { text: moeda(i.preco_unitario * i.quantidade) })
              ),
              i.ingredientes.length ? criar("small", { text: ingredientesDe(i) }) : null,
              i.observacoes ? criar("small", { class: "obs", text: "Obs: " + i.observacoes }) : null
            )
          )
        ),
        p.desconto > 0 ? linha("Desconto (" + p.cupom + ")", "– " + moeda(p.desconto)) : null,
        entrega ? linha("Taxa de entrega", moeda(p.taxa_entrega)) : null,
        linha("Total", moeda(p.total))
      ),
      blocoChat(p, acoes)
    );
  }

  function vazioDetalhe(alvo) {
    montar(alvo, criar("div", { class: "painel" }, criar("p", { class: "vazio", text: "Selecione um pedido para ver os detalhes." })));
  }

  function comanda(p) {
    const entrega = p.tipo_entrega === "entrega";
    let alvo = achar("#comanda");
    if (!alvo) {
      alvo = criar("div", { id: "comanda" });
      document.body.append(alvo);
    }
    const par = (rotulo, valor) => criar("p", {}, criar("strong", { text: rotulo + ": " }), valor);
    montar(
      alvo,
      criar("h2", { text: "Sabor Caseiro — Pedido #" + p.id }),
      criar("p", { text: new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) }),
      par("Cliente", `${p.nome_cliente} · ${p.telefone}`),
      par("Recebimento", entrega ? "ENTREGA" : "RETIRADA NO LOCAL"),
      entrega ? par("Endereço", enderecoDe(p)) : null,
      par("Pagamento", pagamentoDe(p)),
      p.horario_agendado ? par("Horário agendado", p.horario_agendado) : null,
      p.observacoes ? par("Observações", p.observacoes) : null,
      criar("hr"),
      p.itens.map((i) =>
        criar(
          "div",
          { class: "comanda-item" },
          criar("strong", { text: `${i.quantidade}x ${i.tipo_nome}` + (i.extra ? " (extra)" : "") }),
          i.ingredientes.length ? criar("p", { text: ingredientesDe(i) }) : null,
          i.observacoes ? criar("p", { text: "Obs: " + i.observacoes }) : null
        )
      ),
      criar("hr"),
      p.desconto > 0 ? criar("p", { text: `Desconto (${p.cupom}): – ${moeda(p.desconto)}` }) : null,
      entrega ? criar("p", { text: "Taxa de entrega: " + moeda(p.taxa_entrega) }) : null,
      criar("p", {}, criar("strong", { text: "Total: " + moeda(p.total) }))
    );
    window.print();
  }

  return { casca, lista, detalhe, vazioDetalhe, mensagens };
})();
