document.addEventListener("DOMContentLoaded", async () => {
  const { criar, achar, montar, moeda, tentar, iniciar } = Adm.tela;
  if (!iniciar("configuracoes", "Configurações", "Dados do restaurante, bairros e taxas, cupons de desconto e mensagens de recusa.")) return;

  const raiz = achar("#conteudo");

  function botoesLinha(editar, excluir, rotuloExcluir) {
    return criar("td", { class: "acoes-linha" },
      criar("button", { class: "botao botao-contorno botao-p", text: "Editar", onclick: editar }),
      criar("button", { class: "botao botao-perigo botao-p", text: "Excluir", onclick: async () => { if (confirm(`Excluir ${rotuloExcluir}?`)) excluir(); } }));
  }

  function secao(titulo, descricao, id) {
    const form = criar("form", { class: "form-linha", id: "form-" + id });
    const alvo = criar("div", { id: "lista-" + id });
    raiz.append(criar("div", { class: "painel", id: "secao-" + id },
      criar("div", { class: "painel-topo" }, criar("div", {}, criar("h3", { text: titulo }), criar("p", { text: descricao }))),
      form, alvo));
    return { form, alvo };
  }

  function loja() {
    const { form, alvo } = secao("Dados do restaurante", "Aparecem para o cliente: rodapé, retirada, prazos e horário de funcionamento.", "loja");
    alvo.hidden = true;
    const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const campo = (rotulo, nome, valor, extra = {}) => criar("div", { class: "campo" },
      criar("label", { text: rotulo }), criar("input", { name: nome, value: valor, required: true, ...extra }));
    const dia = (nome, selecionado) => criar("select", { name: nome },
      DIAS.map((d, i) => criar("option", { value: i, text: d, selected: i === selecionado })));

    function desenharForm(l) {
      const m = /^(\d)-(\d) (\d\d:\d\d)-(\d\d:\d\d)$/.exec(l.horario);
      montar(form,
        campo("Nome", "nome", l.nome, { maxlength: "80" }),
        campo("Endereço", "endereco", l.endereco, { maxlength: "160" }),
        campo("Telefone", "telefone", l.telefone, { maxlength: "30", type: "tel" }),
        campo("Prazo de entrega", "prazo_entrega", l.prazo_entrega, { maxlength: "30" }),
        campo("Prazo de retirada", "prazo_retirada", l.prazo_retirada, { maxlength: "30" }),
        criar("div", { class: "campo" }, criar("label", { text: "Abre de" }), dia("de", Number(m[1]))),
        criar("div", { class: "campo" }, criar("label", { text: "até" }), dia("ate", Number(m[2]))),
        criar("div", { class: "campo" }, criar("label", { text: "Abertura" }), criar("input", { name: "abre", type: "time", value: m[3], required: true })),
        criar("div", { class: "campo" }, criar("label", { text: "Fechamento" }), criar("input", { name: "fecha", type: "time", value: m[4], required: true })),
        criar("button", { type: "submit", class: "botao botao-principal", text: "Salvar dados" }));
    }

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const c = form.elements;
      const dados = {
        nome: c.nome.value, endereco: c.endereco.value, telefone: c.telefone.value,
        prazo_entrega: c.prazo_entrega.value, prazo_retirada: c.prazo_retirada.value,
        horario: `${c.de.value}-${c.ate.value} ${c.abre.value}-${c.fecha.value}`,
      };
      const salvo = await tentar(() => Adm.api.loja.salvar(dados), "Dados salvos.");
      if (salvo && salvo.horario) desenharForm(salvo);
    });

    Adm.api.loja.ver().then(desenharForm).catch((falha) => montar(form, criar("p", { class: "msg-erro", text: falha.message })));
  }

  function bairros() {
    const { form, alvo } = secao("Bairros e taxa de entrega", "Só os bairros ativos aparecem para o cliente.", "bairros");
    let lista = [];
    let edicao = null;
    function desenharForm() {
      const b = edicao || { nome: "", taxa_entrega: "", ativo: true };
      montar(form,
        criar("div", { class: "campo" }, criar("label", { text: "Bairro" }), criar("input", { name: "nome", value: b.nome, maxlength: "80", required: true })),
        criar("div", { class: "campo" }, criar("label", { text: "Taxa (R$)" }), criar("input", { name: "taxa", type: "number", min: "0", step: "0.01", value: b.taxa_entrega, required: true })),
        criar("label", { class: "check" }, criar("input", { type: "checkbox", name: "ativo", checked: b.ativo }), criar("span", { text: "Ativo" })),
        criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar" : "Adicionar" }),
        edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: () => { edicao = null; desenharForm(); } }) : null);
    }
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const c = form.elements;
      const dados = { nome: c.nome.value, taxa_entrega: c.taxa.value, ativo: c.ativo.checked };
      if (await tentar(() => (edicao ? Adm.api.bairros.salvar(edicao.id, dados) : Adm.api.bairros.criar(dados)), "Bairro salvo.")) { edicao = null; desenharForm(); carregar(); }
    });
    function desenhar() {
      montar(alvo, criar("table", { class: "tabela" },
        criar("thead", {}, criar("tr", {}, ["Bairro", "Taxa", "Situação", ""].map((t) => criar("th", { text: t })))),
        criar("tbody", {}, lista.map((b) => criar("tr", {},
          criar("td", { text: b.nome }), criar("td", { text: moeda(b.taxa_entrega) }),
          criar("td", {}, criar("span", { class: "selo " + (b.ativo ? "selo-ok" : "selo-neutro"), text: b.ativo ? "Ativo" : "Inativo" })),
          botoesLinha(() => { edicao = b; desenharForm(); }, async () => { if (await Adm.tela.excluir(Adm.api.bairros.remover, b.id, "Bairro excluído.")) carregar(); }, `o bairro ${b.nome}`))))));
    }
    async function carregar() {
      try { lista = await Adm.api.bairros.listar(); desenhar(); } catch (falha) { montar(alvo, criar("p", { class: "msg-erro", text: falha.message })); }
    }
    desenharForm();
    carregar();
  }

  function cupons() {
    const { form, alvo } = secao("Cupons de desconto", "Defina o percentual, as condições de uso e ative ou desative quando quiser.", "cupons");
    let lista = [];
    let edicao = null;
    function desenharForm() {
      const c = edicao || { codigo: "", percentual: "", valor_minimo: 0, valido_ate: "", apenas_primeiro_pedido: false, ativo: true };
      montar(form,
        criar("div", { class: "campo" }, criar("label", { text: "Código" }), criar("input", { name: "codigo", value: c.codigo, maxlength: "30", required: true, readonly: !!edicao })),
        criar("div", { class: "campo" }, criar("label", { text: "Desconto (%)" }), criar("input", { name: "percentual", type: "number", min: "1", max: "100", step: "0.01", value: c.percentual, required: true })),
        criar("div", { class: "campo" }, criar("label", { text: "Pedido mínimo (R$)" }), criar("input", { name: "minimo", type: "number", min: "0", step: "0.01", value: c.valor_minimo })),
        criar("div", { class: "campo" }, criar("label", { text: "Válido até" }), criar("input", { name: "ate", type: "date", value: c.valido_ate || "" })),
        criar("label", { class: "check" }, criar("input", { type: "checkbox", name: "primeiro", checked: c.apenas_primeiro_pedido }), criar("span", { text: "Só no 1º pedido" })),
        criar("label", { class: "check" }, criar("input", { type: "checkbox", name: "ativo", checked: c.ativo }), criar("span", { text: "Ativo" })),
        criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar" : "Adicionar" }),
        edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: () => { edicao = null; desenharForm(); } }) : null);
    }
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const c = form.elements;
      const dados = {
        codigo: c.codigo.value, percentual: c.percentual.value, valor_minimo: c.minimo.value || 0,
        valido_ate: c.ate.value || null, apenas_primeiro_pedido: c.primeiro.checked, ativo: c.ativo.checked,
      };
      if (await tentar(() => (edicao ? Adm.api.cupons.salvar(edicao.codigo, dados) : Adm.api.cupons.criar(dados)), "Cupom salvo.")) { edicao = null; desenharForm(); carregar(); }
    });
    function condicoes(c) {
      const lista = [];
      if (c.apenas_primeiro_pedido) lista.push("1º pedido");
      if (c.valor_minimo > 0) lista.push("mín. " + moeda(c.valor_minimo));
      if (c.valido_ate) lista.push("até " + c.valido_ate.split("-").reverse().join("/"));
      return lista.join(" · ") || "sem condições";
    }
    function desenhar() {
      montar(alvo, criar("table", { class: "tabela" },
        criar("thead", {}, criar("tr", {}, ["Código", "Desconto", "Condições", "Situação", ""].map((t) => criar("th", { text: t })))),
        criar("tbody", {}, lista.map((c) => criar("tr", {},
          criar("td", {}, criar("strong", { text: c.codigo })), criar("td", { text: c.percentual + "%" }), criar("td", { text: condicoes(c) }),
          criar("td", {}, criar("button", {
            class: "selo " + (c.ativo ? "selo-ok" : "selo-neutro") + " selo-botao", text: c.ativo ? "Ativo" : "Inativo", title: "Clique para alternar",
            onclick: async () => { if (await tentar(() => Adm.api.cupons.salvar(c.codigo, { ...c, ativo: !c.ativo }))) carregar(); },
          })),
          botoesLinha(() => { edicao = c; desenharForm(); }, async () => { if (await tentar(() => Adm.api.cupons.remover(c.codigo), "Cupom excluído.")) carregar(); }, `o cupom ${c.codigo}`))))));
    }
    async function carregar() {
      try { lista = await Adm.api.cupons.listar(); desenhar(); } catch (falha) { montar(alvo, criar("p", { class: "msg-erro", text: falha.message })); }
    }
    desenharForm();
    carregar();
  }

  function recusas() {
    const { form, alvo } = secao("Mensagens de recusa", "Textos prontos que o gerente escolhe ao recusar um pedido.", "recusas");
    let lista = [];
    let edicao = null;
    function desenharForm() {
      montar(form,
        criar("div", { class: "campo campo-largo" }, criar("label", { text: "Mensagem" }), criar("input", { name: "texto", value: edicao ? edicao.texto : "", maxlength: "300", required: true })),
        criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar" : "Adicionar" }),
        edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: () => { edicao = null; desenharForm(); } }) : null);
    }
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const dados = { texto: form.elements.texto.value };
      if (await tentar(() => (edicao ? Adm.api.recusas.salvar(edicao.id, dados) : Adm.api.recusas.criar(dados)), "Mensagem salva.")) { edicao = null; desenharForm(); carregar(); }
    });
    function desenhar() {
      montar(alvo, criar("table", { class: "tabela" },
        criar("tbody", {}, lista.map((r) => criar("tr", {},
          criar("td", { text: r.texto }),
          botoesLinha(() => { edicao = r; desenharForm(); }, async () => { if (await tentar(() => Adm.api.recusas.remover(r.id), "Mensagem excluída.")) carregar(); }, "esta mensagem"))))));
    }
    async function carregar() {
      try { lista = await Adm.api.recusas.listar(); desenhar(); } catch (falha) { montar(alvo, criar("p", { class: "msg-erro", text: falha.message })); }
    }
    desenharForm();
    carregar();
  }

  montar(raiz);
  loja();
  bairros();
  cupons();
  recusas();
});
