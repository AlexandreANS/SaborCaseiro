window.Adm = window.Adm || {};
Adm.visao = Adm.visao || {};

Adm.visao.configuracoes = (function () {
  const { criar, montar, moeda } = Dom;
  const { selo, cabecalhoTabela } = Adm.visao.base;

  const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  function secao(raiz, titulo, descricao, id) {
    const form = criar("form", { class: "form-linha", id: "form-" + id });
    const alvo = criar("div", { id: "lista-" + id });
    raiz.append(
      criar(
        "div",
        { class: "painel", id: "secao-" + id },
        criar("div", { class: "painel-topo" }, criar("div", {}, criar("h2", { text: titulo }), criar("p", { text: descricao }))),
        form,
        alvo
      )
    );
    return { form, alvo };
  }

  const cancelar = (edicao, acao) =>
    edicao ? criar("button", { type: "button", class: "botao botao-contorno", text: "Cancelar", onclick: acao }) : null;

  const botoesLinha = (editar, excluir) =>
    criar(
      "td",
      { class: "acoes-linha" },
      criar("button", { class: "botao botao-contorno botao-p", text: "Editar", onclick: editar }),
      criar("button", { class: "botao botao-perigo botao-p", text: "Excluir", onclick: excluir })
    );

  function lojaForm(form, l) {
    const campo = (rotulo, nome, valor, extra = {}) =>
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: rotulo }),
        criar("input", { name: nome, value: valor, required: true, ...extra })
      );
    const dia = (nome, selecionado) =>
      criar(
        "select",
        { name: nome },
        DIAS.map((d, i) => criar("option", { value: i, text: d, selected: i === selecionado }))
      );
    const m = /^(\d)-(\d) (\d\d:\d\d)-(\d\d:\d\d)$/.exec(l.horario);
    montar(
      form,
      campo("Nome", "nome", l.nome, { maxlength: "80" }),
      campo("Endereço", "endereco", l.endereco, { maxlength: "160" }),
      campo("Telefone", "telefone", l.telefone, { maxlength: "30", type: "tel" }),
      campo("Prazo de entrega", "prazo_entrega", l.prazo_entrega, { maxlength: "30" }),
      campo("Prazo de retirada", "prazo_retirada", l.prazo_retirada, { maxlength: "30" }),
      criar("div", { class: "campo" }, criar("label", { text: "Abre de" }), dia("de", Number(m[1]))),
      criar("div", { class: "campo" }, criar("label", { text: "até" }), dia("ate", Number(m[2]))),
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Abertura" }),
        criar("input", { name: "abre", type: "time", value: m[3], required: true })
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Fechamento" }),
        criar("input", { name: "fecha", type: "time", value: m[4], required: true })
      ),
      criar("button", { type: "submit", class: "botao botao-principal", text: "Salvar dados" })
    );
  }

  function lojaDados(form) {
    const c = form.elements;
    return {
      nome: c.nome.value,
      endereco: c.endereco.value,
      telefone: c.telefone.value,
      prazo_entrega: c.prazo_entrega.value,
      prazo_retirada: c.prazo_retirada.value,
      horario: `${c.de.value}-${c.ate.value} ${c.abre.value}-${c.fecha.value}`,
    };
  }

  function bairroForm(form, edicao, aoCancelar) {
    const b = edicao || { nome: "", taxa_entrega: "", ativo: true };
    montar(
      form,
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Bairro" }),
        criar("input", { name: "nome", value: b.nome, maxlength: "80", required: true })
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Taxa (R$)" }),
        criar("input", { name: "taxa", type: "number", min: "0", step: "0.01", value: b.taxa_entrega, required: true })
      ),
      criar(
        "label",
        { class: "check" },
        criar("input", { type: "checkbox", name: "ativo", checked: b.ativo }),
        criar("span", { text: "Ativo" })
      ),
      criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar" : "Adicionar" }),
      cancelar(edicao, aoCancelar)
    );
  }

  const bairroDados = (form) => ({
    nome: form.elements.nome.value,
    taxa_entrega: form.elements.taxa.value,
    ativo: form.elements.ativo.checked,
  });

  function bairroLista(alvo, lista, acoes) {
    montar(
      alvo,
      criar(
        "table",
        { class: "tabela" },
        cabecalhoTabela(["Bairro", "Taxa", "Situação", ""]),
        criar(
          "tbody",
          {},
          lista.map((b) =>
            criar(
              "tr",
              {},
              criar("td", { text: b.nome }),
              criar("td", { text: moeda(b.taxa_entrega) }),
              criar("td", {}, selo(b.ativo)),
              botoesLinha(
                () => acoes.editar(b),
                () => {
                  if (confirm(`Excluir o bairro ${b.nome}?`)) acoes.excluir(b);
                }
              )
            )
          )
        )
      )
    );
  }

  function cupomForm(form, edicao, aoCancelar) {
    const c = edicao || { codigo: "", percentual: "", valor_minimo: 0, valido_ate: "", apenas_primeiro_pedido: false, ativo: true };
    montar(
      form,
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Código" }),
        criar("input", { name: "codigo", value: c.codigo, maxlength: "30", required: true, readonly: !!edicao })
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Desconto (%)" }),
        criar("input", { name: "percentual", type: "number", min: "1", max: "100", step: "0.01", value: c.percentual, required: true })
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Pedido mínimo (R$)" }),
        criar("input", { name: "minimo", type: "number", min: "0", step: "0.01", value: c.valor_minimo })
      ),
      criar(
        "div",
        { class: "campo" },
        criar("label", { text: "Válido até" }),
        criar("input", { name: "ate", type: "date", value: c.valido_ate || "" })
      ),
      criar(
        "label",
        { class: "check" },
        criar("input", { type: "checkbox", name: "primeiro", checked: c.apenas_primeiro_pedido }),
        criar("span", { text: "Só no 1º pedido" })
      ),
      criar(
        "label",
        { class: "check" },
        criar("input", { type: "checkbox", name: "ativo", checked: c.ativo }),
        criar("span", { text: "Ativo" })
      ),
      criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar" : "Adicionar" }),
      cancelar(edicao, aoCancelar)
    );
  }

  function cupomDados(form) {
    const c = form.elements;
    return {
      codigo: c.codigo.value,
      percentual: c.percentual.value,
      valor_minimo: c.minimo.value || 0,
      valido_ate: c.ate.value || null,
      apenas_primeiro_pedido: c.primeiro.checked,
      ativo: c.ativo.checked,
    };
  }

  function condicoes(c) {
    const lista = [];
    if (c.apenas_primeiro_pedido) lista.push("1º pedido");
    if (c.valor_minimo > 0) lista.push("mín. " + moeda(c.valor_minimo));
    if (c.valido_ate) lista.push("até " + c.valido_ate.split("-").reverse().join("/"));
    return lista.join(" · ") || "sem condições";
  }

  function cupomLista(alvo, lista, acoes) {
    montar(
      alvo,
      criar(
        "table",
        { class: "tabela" },
        cabecalhoTabela(["Código", "Desconto", "Condições", "Situação", ""]),
        criar(
          "tbody",
          {},
          lista.map((c) =>
            criar(
              "tr",
              {},
              criar("td", {}, criar("strong", { text: c.codigo })),
              criar("td", { text: c.percentual + "%" }),
              criar("td", { text: condicoes(c) }),
              criar(
                "td",
                {},
                criar("button", {
                  class: "selo " + (c.ativo ? "selo-ok" : "selo-neutro") + " selo-botao",
                  text: c.ativo ? "Ativo" : "Inativo",
                  title: "Clique para alternar",
                  onclick: () => acoes.alternar(c),
                })
              ),
              botoesLinha(
                () => acoes.editar(c),
                () => {
                  if (confirm(`Excluir o cupom ${c.codigo}?`)) acoes.excluir(c);
                }
              )
            )
          )
        )
      )
    );
  }

  function recusaForm(form, edicao, aoCancelar) {
    montar(
      form,
      criar(
        "div",
        { class: "campo campo-largo" },
        criar("label", { text: "Mensagem" }),
        criar("input", { name: "texto", value: edicao ? edicao.texto : "", maxlength: "300", required: true })
      ),
      criar("button", { type: "submit", class: "botao botao-principal", text: edicao ? "Salvar" : "Adicionar" }),
      cancelar(edicao, aoCancelar)
    );
  }

  function recusaLista(alvo, lista, acoes) {
    montar(
      alvo,
      criar(
        "table",
        { class: "tabela" },
        criar(
          "tbody",
          {},
          lista.map((r) =>
            criar(
              "tr",
              {},
              criar("td", { text: r.texto }),
              botoesLinha(
                () => acoes.editar(r),
                () => {
                  if (confirm("Excluir esta mensagem?")) acoes.excluir(r);
                }
              )
            )
          )
        )
      )
    );
  }

  return { secao, lojaForm, lojaDados, bairroForm, bairroDados, bairroLista, cupomForm, cupomDados, cupomLista, recusaForm, recusaLista };
})();
