Sabor.controle.home = {
  titulo: "Início",
  ativa: "home",
  async montar(raiz, params) {
    const { desenhar, semCardapio } = Sabor.visao.base;
    const visao = Sabor.visao.home;
    desenhar(raiz, visao.molde);
    Dom.achar("#botao-como", raiz).addEventListener("click", () =>
      Dom.achar("#como-funciona", raiz).scrollIntoView({ behavior: "smooth" })
    );

    Sabor.app.loja().then((loja) => {
      if (loja) visao.horario(raiz, loja);
    });
    try {
      const cardapio = await Sabor.api.cardapio();
      if (!cardapio.tipos.length) return visao.aviso(raiz, semCardapio(cardapio), "suave");
      visao.tipos(raiz, cardapio.tipos);
    } catch (erro) {
      visao.aviso(raiz, erro.message, "msg-erro");
    }
  },
};
