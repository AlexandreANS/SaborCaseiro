Sabor.controle.cadastro = {
  titulo: "Criar conta",
  ativa: null,
  soVisitante: true,
  simples: true,
  async montar(raiz, params) {
    const { desenhar, mostrarErro, travarBotao, manterDestino } = Sabor.visao.base;
    desenhar(raiz, Sabor.visao.cadastro.molde);
    const form = Dom.achar("[data-form='cadastro']", raiz);
    const erro = Dom.achar("#form-erro", raiz);
    manterDestino(raiz, "#link-login", "#/login", params);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      const campos = Object.fromEntries(new FormData(form));
      if (campos.senha !== campos.confirmar_senha) return mostrarErro(erro, "As senhas não conferem.");
      travarBotao(form, true, "Criando conta...");
      try {
        const { token, cliente } = await Sabor.api.cadastrar({
          nome: campos.nome,
          email: campos.email,
          telefone: campos.telefone,
          senha: campos.senha,
        });
        Sabor.sessao.entrar(token, cliente, true);
        Sabor.rota.ir(Sabor.app.destinoSeguro(params));
      } catch (falha) {
        mostrarErro(erro, falha.message);
        travarBotao(form, false);
      }
    });
  },
};
