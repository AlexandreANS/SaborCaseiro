window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.montar = (function () {
  const { criar, achar, montar, moeda } = Dom;

  const molde = `
<section class="topo curto" aria-label="Apresentação">
  <div class="conteudo">
    <h1>Monte sua Marmita</h1>
    <p>Escolha seus ingredientes favoritos e monte o prato perfeito para o seu almoço. Bebidas e sobremesas você adiciona no carrinho.</p>
  </div>
</section>

<main class="conteudo montagem">
  <div id="passos"><div class="etapa"><p class="suave">Carregando cardápio...</p></div></div>
  <aside class="resumo" id="resumo" aria-live="polite"></aside>
</main>
`;

  const teclaAtiva = (ev) => ev.key === "Enter" || ev.key === " ";
  const folga = (cat) => cat.maximo - cat.minimo;

  function dica(cat) {
    const { minimo, maximo } = cat;
    const base = `Escolha ${minimo} ${minimo === 1 ? "opção incluída" : "opções incluídas"} no preço`;
    if (maximo === minimo) return base + ".";
    return `${base}. Quer mais? Adicione até ${folga(cat)} ${folga(cat) === 1 ? "extra" : "extras"} pelo valor ao lado.`;
  }

  function etapa(numero, titulo, dicaTexto, conteudo) {
    return criar(
      "div",
      { class: "etapa" },
      criar(
        "div",
        { class: "etapa-topo" },
        numero ? criar("span", { class: "etapa-num", text: numero }) : null,
        criar("h2", { text: titulo })
      ),
      dicaTexto ? criar("p", { class: "etapa-dica" + (numero ? "" : " sem-recuo"), text: dicaTexto }) : null,
      conteudo
    );
  }

  function cartao(classe, marcado, aoClicar, ...filhos) {
    return criar(
      "div",
      {
        class: classe + (marcado ? " marcado" : ""),
        tabindex: "0",
        role: "radio",
        "aria-checked": String(marcado),
        onclick: aoClicar,
        onkeydown: (ev) => {
          if (teclaAtiva(ev)) {
            ev.preventDefault();
            ev.target.click();
          }
        },
      },
      ...filhos
    );
  }

  function botaoExtra(op, delta, texto, desativado, aoClicar) {
    return criar("button", {
      type: "button",
      disabled: desativado,
      "aria-label": (delta > 0 ? "Mais um extra de " : "Menos um extra de ") + op.nome,
      text: texto,
      onclick: (ev) => {
        ev.stopPropagation();
        aoClicar(op, delta);
      },
    });
  }

  function opcao(cat, op, d, acoes) {
    const marcada = d.marcados(cat).includes(op.id);
    const unica = cat.minimo === 1;
    const qtd = d.qtdExtra(cat, op.id);
    const cheio = d.extrasDe(cat).length >= folga(cat);
    const sel = criar(
      "label",
      { class: "opcao-sel" },
      criar("input", {
        type: unica ? "radio" : "checkbox",
        name: "cat-" + cat.categoria,
        checked: marcada,
        "data-foco": cat.categoria + "-" + op.id,
        onclick: (ev) => {
          ev.preventDefault();
          acoes.alternar(cat, op);
        },
      }),
      criar("span", { class: "opcao-nome", text: op.nome })
    );
    const mais =
      folga(cat) > 0
        ? criar(
            "div",
            { class: "opcao-mais" },
            op.preco_extra > 0 ? criar("span", { class: "opcao-preco", text: "+ " + moeda(op.preco_extra) }) : null,
            criar(
              "div",
              { class: "quantidade" },
              botaoExtra(op, -1, "−", qtd === 0, (o) => acoes.mudarExtra(cat, o, -1)),
              criar("span", { class: "opcao-qtd", text: String(qtd) }),
              botaoExtra(op, 1, "+", cheio, (o) => acoes.mudarExtra(cat, o, 1))
            )
          )
        : null;
    return criar("div", { class: "opcao" + (marcada ? " marcado" : "") + (qtd ? " com-extra" : "") }, sel, mais);
  }

  function passos(raiz, d, acoes) {
    const blocos = [
      etapa(
        1,
        "Escolha o Tipo de Marmita",
        "O tipo define as opções de ingredientes disponíveis nas próximas etapas.",
        criar(
          "div",
          { class: "tipos" },
          d.tipos.map((t) =>
            cartao(
              "tipo",
              t.id === d.tipo.id,
              () => acoes.trocarTipo(t),
              criar("strong", { text: t.nome }),
              criar("p", { text: t.descricao || "" }),
              criar("p", { class: "tipo-preco", text: moeda(t.preco) })
            )
          )
        )
      ),
      ...d.tipo.categorias.map((cat, i) =>
        etapa(
          i + 2,
          cat.titulo,
          dica(cat),
          criar(
            "div",
            { class: "opcoes", role: cat.minimo === 1 ? "radiogroup" : "group" },
            cat.opcoes.map((op) => opcao(cat, op, d, acoes))
          )
        )
      ),
      etapa(
        null,
        "Observações Especiais",
        null,
        criar(
          "div",
          { class: "campo" },
          criar("textarea", {
            rows: "3",
            maxlength: "300",
            placeholder: "Algum ingrediente que deseja retirar ou observação?",
            oninput: (ev) => acoes.observar(ev.target.value),
            text: d.obs,
          })
        )
      ),
    ];
    const rolagem = window.scrollY;
    const foco = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.foco : null;
    achar("#passos", raiz).replaceChildren(...blocos);
    window.scrollTo(0, rolagem);
    if (foco) {
      const volta = achar(`[data-foco="${foco}"]`, raiz);
      if (volta) volta.focus({ preventScroll: true });
    }
  }

  function resumo(raiz, d, acoes) {
    montar(
      achar("#resumo", raiz),
      criar("h2", { text: "Sua Marmita" }),
      criar(
        "ul",
        { class: "resumo-lista" },
        d.linhas.map(([nome, valor]) => criar("li", {}, criar("span", { text: nome }), criar("span", { text: valor })))
      ),
      criar("div", { class: "resumo-total" }, criar("span", { text: "Subtotal" }), criar("span", { text: moeda(d.subtotal) })),
      d.falta.length ? criar("p", { class: "resumo-falta", text: "Falta escolher: " + d.falta.join(", ") + "." }) : null,
      criar("button", {
        class: "botao botao-principal botao-cheio",
        disabled: d.falta.length > 0,
        onclick: acoes.adicionar,
        text: "Adicionar ao Carrinho",
      })
    );
  }

  function adicionado(raiz) {
    const botao = achar("button", achar("#resumo", raiz));
    botao.textContent = "Adicionado ✓";
    botao.disabled = true;
  }

  function aviso(raiz, texto, aoTentar) {
    montar(
      achar("#passos", raiz),
      criar(
        "div",
        { class: "etapa" },
        criar("p", { class: aoTentar ? "msg-erro" : "", text: texto }),
        aoTentar
          ? criar("button", { class: "botao botao-contorno", onclick: aoTentar, text: "Tentar novamente" })
          : criar("a", { href: "#/home", class: "botao botao-contorno", text: "Voltar ao início" })
      )
    );
    achar("#resumo", raiz).hidden = true;
  }

  return { molde, passos, resumo, adicionado, aviso };
})();
