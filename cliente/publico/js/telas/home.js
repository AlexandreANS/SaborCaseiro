Sabor.telas.home = {
  titulo: "Início",
  ativa: "home",
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<main class="conteudo">

  <section class="boas-vindas">
    <div>
      <span class="chamada" id="chamada-horario">Seg a Sáb · 11h às 15h</span>
      <h1>Sua marmita, do seu jeito, pronta em minutos.</h1>
      <p>Escolha o tipo, monte com os ingredientes que você quiser e receba
        quentinho onde estiver — ou retire no balcão sem fila.</p>
      <div class="boas-vindas-acoes">
        <a href="#/montar" class="botao botao-principal">Montar minha marmita</a>
        <button type="button" class="botao botao-contorno" id="botao-como">Como funciona</button>
      </div>
    </div>
    <div class="painel" id="painel-tipos" aria-live="polite">
      <p class="suave">Carregando cardápio...</p>
    </div>
  </section>

  <section id="como-funciona">
    <div class="secao-titulo"><h2>Como funciona</h2></div>
    <div class="passos-grade">
      <div class="passo">
        <div class="etapa-num">1</div>
        <h3>Escolha o tipo</h3>
        <p>Infantil, Fit, Duas Carnes, Familiar... cada tipo com seu preço.</p>
      </div>
      <div class="passo">
        <div class="etapa-num">2</div>
        <h3>Monte do seu jeito</h3>
        <p>Carboidrato, proteína, acompanhamentos e saladas à sua escolha.</p>
      </div>
      <div class="passo">
        <div class="etapa-num">3</div>
        <h3>Receba ou retire</h3>
        <p id="texto-prazos">Entrega ou retirada no balcão, você escolhe.</p>
      </div>
    </div>
  </section>

  <section>
    <div class="secao-titulo">
      <h2>Cardápio de hoje</h2>
      <a href="#/montar">Ver todos os ingredientes →</a>
    </div>
    <div class="grade-tipos" id="cartoes-tipos"></div>
  </section>

  <section class="promocao">
    <div>
      <h3>Primeiro pedido? Ganhe 10% de desconto.</h3>
      <p>Use o cupom <strong>SABORCASEIRO10</strong> no carrinho.</p>
    </div>
    <a href="#/montar" class="botao botao-contorno">Aproveitar agora</a>
  </section>

</main>
`);
    const { criar, achar, moeda } = Sabor.tela;
    achar("#botao-como", raiz).addEventListener("click", () => achar("#como-funciona", raiz).scrollIntoView({ behavior: "smooth" }));

    const painel = achar("#painel-tipos", raiz);
    const cartoes = achar("#cartoes-tipos", raiz);
    Sabor.tela.loja().then((l) => {
      if (!l) return;
      const f = l.funcionamento;
      achar("#chamada-horario", raiz).textContent = f.texto + " · " + (f.aberto ? "Aberto agora" : "Fechado agora");
      achar("#texto-prazos", raiz).textContent = `Entrega em ${l.prazo_entrega} ou retirada no balcão em ${l.prazo_retirada}.`;
    });
    try {
      const cardapio = await Sabor.api.cardapio();
      const tipos = cardapio.tipos;
      if (!tipos.length) {
        painel.replaceChildren(criar("p", { class: "suave", text: Sabor.tela.semCardapio(cardapio) }));
        cartoes.replaceChildren();
        return;
      }
      painel.replaceChildren(...tipos.map((t) =>
        criar("div", { class: "prato-linha" },
          criar("span", {}, criar("strong", { text: t.nome })),
          criar("span", { class: "prato-preco", text: moeda(t.preco) }))));
      cartoes.replaceChildren(...tipos.map((t) =>
        criar("div", { class: "tipo-card" },
          criar("strong", { text: t.nome }),
          criar("div", { class: "preco", text: moeda(t.preco) }),
          criar("p", { text: t.descricao || "" }))));
    } catch (erro) {
      painel.replaceChildren(criar("p", { class: "msg-erro", text: erro.message }));
      cartoes.replaceChildren();
    }
  },
};
