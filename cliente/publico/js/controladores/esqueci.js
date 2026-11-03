Sabor.controle.esqueci = {
  titulo: "Esqueci a senha",
  ativa: null,
  soVisitante: true,
  simples: true,
  async montar(raiz, params) {
    const { desenhar, mostrarErro } = Sabor.visao.base;
    desenhar(raiz, Sabor.visao.esqueci.molde);
    const form = Dom.achar("[data-form='esqueci']", raiz);
    const erro = Dom.achar("#form-erro", raiz);
    const ok = Dom.achar("#form-ok", raiz);
    const botao = Dom.achar("button[type=submit]", form);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      ok.hidden = true;
      botao.disabled = true;
      try {
        const r = await Sabor.api.esqueci(form.elements.email.value);
        ok.textContent = r.mensagem;
        ok.hidden = false;
        if (r.link) ok.append(" ", Dom.criar("a", { href: r.link.slice(r.link.indexOf("#")), text: "Abrir link (modo de teste)" }));
      } catch (falha) {
        mostrarErro(erro, falha.message);
      }
      botao.disabled = false;
    });
  },
};
