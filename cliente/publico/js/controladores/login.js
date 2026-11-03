Sabor.controle.login = {
  titulo: "Entrar",
  ativa: null,
  soVisitante: true,
  simples: true,
  async montar(raiz, params) {
    const { desenhar, mostrarErro, travarBotao, manterDestino } = Sabor.visao.base;
    desenhar(raiz, Sabor.visao.login.molde);
    const form = Dom.achar("[data-form='login']", raiz);
    const erro = Dom.achar("#form-erro", raiz);
    manterDestino(raiz, "#link-cadastro", "#/cadastro", params);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      travarBotao(form, true, "Entrando...");
      try {
        const campos = Object.fromEntries(new FormData(form));
        const { token, cliente } = await Sabor.api.login(campos.email, campos.senha);
        Sabor.sessao.entrar(token, cliente, form.elements.lembrar.checked);
        Sabor.rota.ir(Sabor.app.destinoSeguro(params));
      } catch (falha) {
        mostrarErro(erro, falha.message);
        travarBotao(form, false);
      }
    });
  },
};
