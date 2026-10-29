document.addEventListener("DOMContentLoaded", async () => {
  const { criar, achar, montar, moeda, aviso, tentar, iniciar, FORMAS, SELO } = Adm.tela;
  if (!iniciar("pedidos", "Pedidos", "Aceite, recuse e acompanhe cada pedido. A lista atualiza sozinha.")) return;

  const FILTROS = [
    ["", "Todos"], ["Esperando", "Aguardando aceite"], ["Preparando", "Preparando"],
    ["Saiu para Entrega", "Saiu para entrega"], ["Pronto para Retirada", "Pronto para retirada"],
    ["Concluído", "Concluídos"], ["Cancelado", "Recusados"],
  ];
  const TITULO = document.title;
  const estado = { filtro: "", todos: null, aberto: null, recusas: [], recusando: null, assinaturaLista: "", detalhe: null, som: lerSom(), limite: 50, contagem: null, total: null };
  let audio = null;
  const raiz = achar("#conteudo");
  const alvoLista = criar("div", { class: "painel" });
  const alvoDetalhe = criar("div", { class: "detalhe" });
  montar(raiz, criar("div", { class: "duas-colunas" }, alvoLista, alvoDetalhe));

  function lerSom() {
    try { return localStorage.getItem("adm.som") === "1"; } catch { return false; }
  }

  function gravarSom(ligado) {
    try { localStorage.setItem("adm.som", ligado ? "1" : "0"); } catch {}
  }

  function bipe() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      [0, 0.25].forEach((atraso) => {
        const osc = audio.createOscillator();
        const ganho = audio.createGain();
        osc.frequency.value = 880;
        ganho.gain.setValueAtTime(0.0001, audio.currentTime + atraso);
        ganho.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + atraso + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + atraso + 0.2);
        osc.connect(ganho).connect(audio.destination);
        osc.start(audio.currentTime + atraso);
        osc.stop(audio.currentTime + atraso + 0.22);
      });
    } catch {}
  }

  async function alternarSom() {
    estado.som = !estado.som;
    gravarSom(estado.som);
    if (estado.som) {
      bipe();
      if ("Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch {}
      }
    }
    desenharLista();
  }

  function avisarNovos(novos) {
    if (!novos.length) return;
    novos.forEach((p) => aviso(`Novo pedido #${p.id} de ${p.nome_cliente}`, "ok"));
    if (!estado.som) return;
    bipe();
    if (document.hidden && "Notification" in window && Notification.permission === "granted") {
      const p = novos[novos.length - 1];
      try { new Notification("Novo pedido #" + p.id, { body: p.nome_cliente + " · " + moeda(p.total) }); } catch {}
    }
  }

  function imprimirComanda(p) {
    const entrega = p.tipo_entrega === "entrega";
    let alvo = achar("#comanda");
    if (!alvo) {
      alvo = criar("div", { id: "comanda" });
      document.body.append(alvo);
    }
    const par = (rotulo, valor) => criar("p", {}, criar("strong", { text: rotulo + ": " }), valor);
    montar(alvo,
      criar("h2", { text: "Sabor Caseiro — Pedido #" + p.id }),
      criar("p", { text: new Date(p.criado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) }),
      par("Cliente", `${p.nome_cliente} · ${p.telefone}`),
      par("Recebimento", entrega ? "ENTREGA" : "RETIRADA NO LOCAL"),
      entrega ? par("Endereço", `${p.rua}, ${p.numero}${p.complemento ? " - " + p.complemento : ""} · ${p.bairro_nome || ""}`) : null,
      par("Pagamento", FORMAS[p.forma_pagamento] + (p.troco_para ? ` (troco para ${moeda(p.troco_para)})` : "")),
      p.horario_agendado ? par("Horário agendado", p.horario_agendado) : null,
      p.observacoes ? par("Observações", p.observacoes) : null,
      criar("hr"),
      p.itens.map((i) => criar("div", { class: "comanda-item" },
        criar("strong", { text: `${i.quantidade}x ${i.tipo_nome}` + (i.extra ? " (extra)" : "") }),
        i.ingredientes.length ? criar("p", { text: i.ingredientes.map((g) => g.nome).join(", ") }) : null,
        i.observacoes ? criar("p", { text: "Obs: " + i.observacoes }) : null)),
      criar("hr"),
      p.desconto > 0 ? criar("p", { text: `Desconto (${p.cupom}): – ${moeda(p.desconto)}` }) : null,
      entrega ? criar("p", { text: "Taxa de entrega: " + moeda(p.taxa_entrega) }) : null,
      criar("p", {}, criar("strong", { text: "Total: " + moeda(p.total) })));
    window.print();
  }

  const visiveis = () => estado.todos;

  function chips() {
    return criar("div", { class: "chips" }, FILTROS.map(([valor, rotulo]) => {
      const n = estado.contagem ? (valor ? estado.contagem[valor] : estado.contagem.total) : 0;
      return criar("button", {
        type: "button", class: "chip" + (estado.filtro === valor ? " ativo" : "") + (valor === "Esperando" && n ? " chip-alerta" : ""),
        text: `${rotulo} (${n})`, onclick: () => { estado.filtro = valor; estado.limite = 50; estado.assinaturaLista = ""; carregarLista(); },
      });
    }));
  }

  function desenharLista() {
    const lista = visiveis();
    montar(alvoLista,
      criar("div", { class: "painel-topo" }, criar("h3", { text: "Pedidos" }),
        criar("button", { type: "button", class: "botao botao-contorno botao-p", id: "botao-som", "aria-pressed": String(estado.som), text: estado.som ? "🔔 Avisos ligados" : "🔕 Avisos desligados", onclick: alternarSom })),
      chips(),
      lista.length
        ? criar("table", { class: "tabela espaco-cima" },
            criar("thead", {}, criar("tr", {}, ["Pedido", "Cliente", "Itens", "Total", "Status"].map((t) => criar("th", { text: t })))),
            criar("tbody", {}, lista.map((p) => criar("tr", {
              class: "linha-clicavel" + (estado.aberto === p.id ? " ativa" : ""), "data-id": p.id, onclick: () => abrir(p.id),
            },
              criar("td", { class: "link-linha", text: "#" + p.id }),
              criar("td", { text: p.nome_cliente }),
              criar("td", { text: p.resumo || "—" }),
              criar("td", { text: moeda(p.total) }),
              criar("td", {}, criar("span", { class: "selo " + SELO[p.status], text: p.status_rotulo }))))))
        : criar("p", { class: "vazio", text: "Nenhum pedido neste filtro." }),
      lista.length >= estado.limite
        ? criar("button", { type: "button", class: "botao botao-contorno espaco-cima", text: "Carregar mais pedidos", onclick: () => { estado.limite += 50; carregarLista(); } })
        : null);
  }

  function linha(rotulo, valor) {
    return criar("div", { class: "linha-info" }, criar("span", { text: rotulo }), criar("strong", { text: valor }));
  }

  function blocoDecisao(p) {
    if (estado.recusando !== p.id) {
      return criar("div", { class: "decisao" },
        criar("button", { class: "botao botao-ok", text: "Aceitar pedido", onclick: () => agir(p.id, () => Adm.api.aceitar(p.id), "Pedido aceito!") }),
        criar("button", { class: "botao botao-contorno-perigo", text: "Recusar pedido", onclick: () => { estado.recusando = p.id; desenharDetalhe(estado.detalhe); } }));
    }
    const escolha = criar("select", { id: "recusa-modelo" },
      criar("option", { value: "", text: "Escolha uma mensagem pronta..." }),
      estado.recusas.map((r) => criar("option", { value: r.id, text: r.texto })),
      criar("option", { value: "outro", text: "Outro motivo..." }));
    const livre = criar("input", { type: "text", id: "recusa-livre", maxlength: "300", placeholder: "Escreva o motivo", hidden: true });
    escolha.addEventListener("change", () => { livre.hidden = escolha.value !== "outro"; });
    return criar("div", { class: "painel-recusa" },
      criar("h4", { text: "Recusar pedido #" + p.id }),
      criar("p", { text: "O cliente verá o motivo escolhido abaixo." }),
      escolha, livre,
      criar("div", { class: "botoes" },
        criar("button", {
          class: "botao botao-perigo", text: "Confirmar recusa",
          onclick: () => {
            if (!escolha.value) return aviso("Escolha o motivo da recusa.", "erro");
            const corpo = escolha.value === "outro" ? { motivo: livre.value } : { mensagem_id: Number(escolha.value) };
            agir(p.id, () => Adm.api.recusar(p.id, corpo), "Pedido recusado.");
          },
        }),
        criar("button", { class: "botao botao-contorno", text: "Voltar", onclick: () => { estado.recusando = null; desenharDetalhe(estado.detalhe); } })));
  }

  function blocoStatus(p) {
    const pos = p.passos.findIndex((s) => s.status === p.status);
    const seguintes = p.passos.slice(pos + 1);
    return criar("div", { class: "acoes-pedido" },
      criar("label", { class: "rotulo-campo", text: "Andamento do pedido" }),
      criar("div", { class: "botoes" }, seguintes.map((s, i) =>
        criar("button", {
          class: "botao " + (i === 0 ? "botao-principal" : "botao-contorno"),
          text: s.status === "Concluído" ? "Marcar como " + s.rotulo.toLowerCase() : s.rotulo[0] + s.rotulo.slice(1).toLowerCase(),
          onclick: () => agir(p.id, () => Adm.api.mudarStatus(p.id, s.status), "Status atualizado."),
        }))));
  }

  function blocoAcoes(p) {
    if (p.status === "Cancelado") {
      if (p.cancelado_por === "cliente") return criar("p", { class: "encerrado", text: "Pedido cancelado pelo cliente antes do aceite." });
      return p.motivo_recusa ? criar("p", { class: "motivo-recusa", text: "Motivo da recusa: " + p.motivo_recusa }) : null;
    }
    if (p.status === "Concluído") return criar("p", { class: "encerrado", text: "Pedido " + p.status_rotulo.toLowerCase() + ". Nada mais a fazer." });
    return p.status === "Esperando" ? blocoDecisao(p) : blocoStatus(p);
  }

  async function agir(id, acao, ok) {
    const feito = await tentar(acao, ok);
    if (feito) estado.recusando = null;
    await abrir(id);
    carregarLista();
  }

  function mensagensHtml(lista, p) {
    return lista.length
      ? lista.map((m) => criar("div", { class: "msg msg-" + m.autor },
          criar("small", { text: (m.autor === "equipe" ? "Equipe" : p.nome_cliente) + " · " + new Date(m.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }),
          criar("p", { text: m.texto })))
      : criar("p", { class: "suave", text: "Sem mensagens." });
  }

  function atualizarMensagens(lista) {
    const caixa = achar("#chat-lista");
    if (!caixa) return;
    const noFim = caixa.scrollTop + caixa.clientHeight >= caixa.scrollHeight - 30;
    montar(caixa, mensagensHtml(lista, estado.detalhe));
    if (noFim) caixa.scrollTop = caixa.scrollHeight;
    estado.detalhe.mensagens = lista;
  }

  function blocoChat(p) {
    const lista = criar("div", { class: "chat-lista", id: "chat-lista" }, mensagensHtml(p.mensagens, p));
    const campo = criar("input", { type: "text", maxlength: "500", placeholder: "Mensagem para o cliente", "aria-label": "Mensagem" });
    const form = criar("form", {
      class: "chat-form",
      onsubmit: async (ev) => {
        ev.preventDefault();
        const texto = campo.value.trim();
        if (!texto) return;
        const nova = await tentar(() => Adm.api.enviarMensagem(p.id, texto));
        if (nova) {
          campo.value = "";
          atualizarMensagens(await Adm.api.mensagens(p.id));
          const caixa = achar("#chat-lista");
          caixa.scrollTop = caixa.scrollHeight;
        }
      },
    }, campo, criar("button", { type: "submit", class: "botao botao-principal", text: "Enviar" }));
    setTimeout(() => { lista.scrollTop = lista.scrollHeight; });
    return criar("div", { class: "chat" }, criar("h4", { text: "Conversa com o cliente" }), lista, form);
  }

  function desenharDetalhe(p) {
    estado.detalhe = p;
    const entrega = p.tipo_entrega === "entrega";
    montar(alvoDetalhe, criar("div", { class: "painel" },
      criar("div", { class: "painel-topo" },
        criar("h3", { text: "Pedido #" + p.id }),
        criar("div", { class: "topo-acoes" },
          criar("button", { type: "button", class: "botao botao-contorno botao-p", id: "botao-imprimir", text: "🖨 Imprimir comanda", onclick: () => imprimirComanda(p) }),
          criar("span", { class: "selo " + SELO[p.status], text: p.status_rotulo }))),
      linha("Cliente", `${p.nome_cliente} · ${p.telefone}`),
      linha("Recebimento", entrega ? "Entrega" : "Retirada no local"),
      entrega ? linha("Endereço", `${p.rua}, ${p.numero}${p.complemento ? " - " + p.complemento : ""} · ${p.bairro_nome || ""}`) : null,
      linha("Pagamento", FORMAS[p.forma_pagamento] + (p.troco_para ? ` (troco para ${moeda(p.troco_para)})` : "")),
      p.horario_agendado ? linha("Horário agendado", p.horario_agendado) : null,
      p.observacoes ? linha("Observações", p.observacoes) : null,
      criar("h4", { class: "espaco-cima", text: "Itens" }),
      criar("ul", { class: "itens-pedido" }, p.itens.map((i) => criar("li", {},
        criar("div", { class: "item-topo" }, criar("strong", { text: `${i.quantidade}x ${i.tipo_nome}` + (i.extra ? " (extra)" : "") }), criar("span", { text: moeda(i.preco_unitario * i.quantidade) })),
        i.ingredientes.length ? criar("small", { text: i.ingredientes.map((g) => g.nome).join(", ") }) : null,
        i.observacoes ? criar("small", { class: "obs", text: "Obs: " + i.observacoes }) : null))),
      p.desconto > 0 ? linha("Desconto (" + p.cupom + ")", "– " + moeda(p.desconto)) : null,
      entrega ? linha("Taxa de entrega", moeda(p.taxa_entrega)) : null,
      linha("Total", moeda(p.total)),
      blocoAcoes(p)),
      blocoChat(p));
  }

  async function abrir(id) {
    if (estado.aberto !== id) estado.recusando = null;
    estado.aberto = id;
    try {
      desenharDetalhe(await Adm.api.pedido(id));
      desenharLista();
    } catch (falha) {
      aviso(falha.message, "erro");
    }
  }

  function atualizarTitulo() {
    const n = estado.contagem ? estado.contagem.Esperando : 0;
    document.title = (n ? `(${n}) ` : "") + TITULO;
  }

  async function atualizarAberto() {
    if (!estado.aberto || !estado.detalhe) return;
    try {
      const p = await Adm.api.pedido(estado.aberto);
      if (p.id !== estado.aberto) return;
      if (p.status !== estado.detalhe.status) {
        if (estado.recusando === p.id && p.status !== "Esperando") estado.recusando = null;
        desenharDetalhe(p);
      } else if (p.mensagens.length !== estado.detalhe.mensagens.length) {
        atualizarMensagens(p.mensagens);
      }
    } catch {}
  }

  async function carregarLista() {
    try {
      const [nova, contagem] = await Promise.all([Adm.api.pedidos(estado.filtro, estado.limite), Adm.api.contagem()]);
      const novos = estado.total !== null && contagem.total > estado.total ? contagem.total - estado.total : 0;
      estado.total = contagem.total;
      estado.contagem = contagem;
      estado.todos = nova;
      const assinatura = JSON.stringify([estado.filtro, estado.limite, contagem, nova.map((p) => [p.id, p.status, p.total_msgs])]);
      if (assinatura !== estado.assinaturaLista) {
        estado.assinaturaLista = assinatura;
        desenharLista();
        atualizarTitulo();
      }
      if (novos) avisarNovos((await Adm.api.pedidos("Esperando", novos)).slice(0, novos));
      await atualizarAberto();
    } catch (falha) {
      if (!estado.todos) montar(alvoLista, criar("p", { class: "msg-erro", text: falha.message }));
    }
  }

  try {
    estado.recusas = await Adm.api.recusas.listar();
  } catch (falha) {
    aviso(falha.message, "erro");
  }
  montar(alvoDetalhe, criar("div", { class: "painel" }, criar("p", { class: "vazio", text: "Selecione um pedido para ver os detalhes." })));
  await carregarLista();
  setInterval(() => { if (!document.hidden) carregarLista(); }, 20000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) carregarLista(); });
  Adm.api.tempoReal(() => carregarLista());
});
