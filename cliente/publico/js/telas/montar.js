Sabor.telas.montar = {
  titulo: "Monte sua Marmita",
  ativa: "montar",
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<section class="topo" style="padding-bottom:0;">
  <div class="conteudo">
    <h1>Monte sua Marmita</h1>
    <p>Escolha seus ingredientes favoritos e monte o prato perfeito para o seu almoço. Bebidas e sobremesas você adiciona no carrinho.</p>
  </div>
</section>

<main class="conteudo montagem">
  <div id="passos"><div class="etapa"><p class="suave">Carregando cardápio...</p></div></div>
  <aside class="resumo" id="resumo" aria-live="polite"></aside>
</main>
`);
    const { criar, achar, montar, moeda, aviso } = Sabor.tela;

    const passos = achar("#passos", raiz);
    const resumo = achar("#resumo", raiz);
    let cardapio;
    const estado = { tipo: null, escolhas: {}, obs: "" };

    try {
      cardapio = await Sabor.api.cardapio();
    } catch (erro) {
      passos.replaceChildren(criar("div", { class: "etapa" },
        criar("p", { class: "msg-erro", text: erro.message }),
        criar("button", { class: "botao botao-contorno", onclick: () => Sabor.rota.abrir(), text: "Tentar novamente" })));
      resumo.hidden = true;
      return;
    }

    if (!cardapio.tipos.length) {
      passos.replaceChildren(criar("div", { class: "etapa" }, criar("p", { text: Sabor.tela.semCardapio(cardapio) }), criar("a", { href: "#/home", class: "botao botao-contorno", text: "Voltar ao início" })));
      resumo.hidden = true;
      return;
    }

    estado.tipo = cardapio.tipos[0];

    const marcados = (cat) => estado.escolhas[cat.categoria] || [];
    const nomeCurto = (cat) => cat.titulo.replace(/^Escolha (os |a )?/, "").replace(/^Saladas Verdes e Legumes$/, "Salada");

    function dica(cat) {
      const { minimo, maximo } = cat;
      if (minimo === maximo) return `Selecione ${maximo} ${maximo === 1 ? "opção" : "opções"}`;
      return `Selecione de ${minimo} a ${maximo} opções`;
    }

    function alternar(cat, opcao) {
      const lista = [...marcados(cat)];
      const pos = lista.indexOf(opcao.id);
      if (pos >= 0) lista.splice(pos, 1);
      else if (cat.maximo === 1) lista.splice(0, lista.length, opcao.id);
      else if (lista.length >= cat.maximo) return aviso(`Você pode escolher no máximo ${cat.maximo} opções aqui.`, "info");
      else lista.push(opcao.id);
      estado.escolhas[cat.categoria] = lista;
      desenhar();
    }

    function faltam() {
      return estado.tipo.categorias.filter((c) => marcados(c).length < c.minimo).map((c) => nomeCurto(c).toLowerCase());
    }

    function selecionadas() {
      return estado.tipo.categorias.flatMap((cat) =>
        marcados(cat).map((id) => ({ cat, op: cat.opcoes.find((o) => o.id === id) })).filter((x) => x.op));
    }

    function subtotal() {
      return estado.tipo.preco + selecionadas().reduce((soma, x) => soma + x.op.preco_extra, 0);
    }

    function etapa(numero, titulo, dicaTexto, conteudo) {
      return criar("div", { class: "etapa" },
        criar("div", { class: "etapa-topo" }, numero ? criar("span", { class: "etapa-num", text: numero }) : null, criar("h3", { text: titulo })),
        dicaTexto ? criar("p", { class: "etapa-dica" + (numero ? "" : " sem-recuo"), text: dicaTexto }) : null,
        conteudo);
    }

    const teclaAtiva = (ev) => ev.key === "Enter" || ev.key === " ";

    function linhaOpcao(cat, op) {
      const marcada = marcados(cat).includes(op.id);
      const unica = cat.maximo === 1;
      return criar("label", {
        class: "opcao" + (marcada ? " marcado" : ""), role: unica ? "radio" : "checkbox", "aria-checked": String(marcada), tabindex: "0",
        onclick: (ev) => { ev.preventDefault(); alternar(cat, op); },
        onkeydown: (ev) => { if (teclaAtiva(ev)) { ev.preventDefault(); alternar(cat, op); } },
      },
        criar("span", { class: "opcao-nome", text: op.nome }),
        op.preco_extra > 0 ? criar("span", { class: "opcao-preco", text: "+ " + moeda(op.preco_extra) }) : null,
        criar("input", { type: unica ? "radio" : "checkbox", checked: marcada, tabindex: "-1", "aria-hidden": "true" }));
    }

    function cartao(classe, marcado, aoClicar, ...filhos) {
      return criar("div", {
        class: classe + (marcado ? " marcado" : ""), tabindex: "0", role: "radio", "aria-checked": String(marcado),
        onclick: aoClicar,
        onkeydown: (ev) => { if (teclaAtiva(ev)) { ev.preventDefault(); ev.target.click(); } },
      }, ...filhos);
    }

    function desenhar() {
      const tipo = estado.tipo;
      const blocos = [];

      blocos.push(etapa(1, "Escolha o Tipo de Marmita", "O tipo define as opções de ingredientes disponíveis nas próximas etapas.",
        criar("div", { class: "tipos" }, cardapio.tipos.map((t) =>
          cartao("tipo", t.id === tipo.id, () => { estado.tipo = t; estado.escolhas = {}; desenhar(); },
            criar("strong", { text: t.nome }),
            criar("p", { text: t.descricao || "" }),
            criar("p", { class: "tipo-preco", text: moeda(t.preco) }))))));

      tipo.categorias.forEach((cat, i) => {
        blocos.push(etapa(i + 2, cat.titulo, dica(cat),
          criar("div", { class: "opcoes", role: cat.maximo === 1 ? "radiogroup" : "group" }, cat.opcoes.map((op) => linhaOpcao(cat, op)))));
      });

      blocos.push(etapa(null, "Observações Especiais", null,
        criar("div", { class: "campo" }, criar("textarea", {
          rows: "3", maxlength: "300", placeholder: "Algum ingrediente que deseja retirar ou observação?",
          oninput: (ev) => { estado.obs = ev.target.value; }, text: estado.obs }))));

      const rolagem = window.scrollY;
      passos.replaceChildren(...blocos);
      window.scrollTo(0, rolagem);
      desenharResumo();
    }

    function desenharResumo() {
      const tipo = estado.tipo;
      const falta = faltam();
      const linhas = [
        ["Tipo", tipo.nome],
        ...tipo.categorias.map((c) => [
          nomeCurto(c),
          marcados(c).map((id) => c.opcoes.find((o) => o.id === id)?.nome).filter(Boolean).join(", ") || "—",
        ]),
      ];

      montar(resumo,
        criar("h4", { text: "Sua Marmita" }),
        criar("ul", { class: "resumo-lista" }, linhas.map(([nome, valor]) => criar("li", {}, criar("span", { text: nome }), criar("span", { text: valor })))),
        criar("div", { class: "resumo-total" }, criar("span", { text: "Subtotal" }), criar("span", { text: moeda(subtotal()) })),
        falta.length ? criar("p", { class: "resumo-falta", text: "Falta escolher: " + falta.join(", ") + "." }) : null,
        criar("button", { class: "botao botao-principal botao-cheio", disabled: falta.length > 0, onclick: adicionar, text: "Adicionar ao Carrinho" }));
    }

    function adicionar() {
      const tipo = estado.tipo;
      const todas = selecionadas();
      Sabor.dados.carrinho.adicionar({
        tipo_id: tipo.id,
        ingredientes: todas.map((x) => x.op.id),
        quantidade: 1,
        observacoes: estado.obs.trim() || null,
        titulo: tipo.nome,
        descricao: todas.map((x) => x.op.nome).join(", "),
      });
      const botao = achar("button", resumo);
      botao.textContent = "Adicionado ✓";
      botao.disabled = true;
      setTimeout(() => Sabor.rota.ir("/carrinho"), 500);
    }

    desenhar();
  },
};
