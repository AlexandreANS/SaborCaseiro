Sabor.controle.redefinir = {
  titulo: "Nova senha",
  ativa: null,
  simples: true,
  async montar(raiz, params) {
    const { desenhar, mostrarErro } = Sabor.visao.base;
    desenhar(raiz, Sabor.visao.redefinir.molde);
    const form = Dom.achar("[data-form='redefinir']", raiz);
    const erro = Dom.achar("#form-erro", raiz);
    const botao = Dom.achar("button[type=submit]", form);
    const token = params.get("token");
    if (!token) mostrarErro(erro, "Link incompleto. Peça um novo link.");

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      if (form.elements.senha.value !== form.elements.confirmar.value) return mostrarErro(erro, "As senhas não conferem.");
      botao.disabled = true;
      try {
        const r = await Sabor.api.redefinir(token, form.elements.senha.value);
        Sabor.sessao.sair(false);
        Dom.aviso(r.mensagem, "ok");
        Sabor.rota.ir("/login", true);
      } catch (falha) {
        mostrarErro(erro, falha.message);
        botao.disabled = false;
      }
    });
  },
};
