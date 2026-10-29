Sabor.telas.esqueci = {
  titulo: "Esqueci a senha",
  ativa: null,
  soVisitante: true,
  simples: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<section class="topo">
  <div class="conteudo">
    <h1>Esqueceu a senha?</h1>
    <p>Sem problema: enviamos um link para você criar outra.</p>
  </div>
</section>

<main class="conteudo">
  <div class="cartao-form">
    <h2>Recuperar acesso</h2>
    <p class="subtitulo">Informe o e-mail da sua conta</p>

    <form data-form="esqueci">
      <div class="campo">
        <label for="email">E-mail</label>
        <input type="email" id="email" name="email" placeholder="seuemail@exemplo.com.br" autocomplete="email" required>
      </div>
      <p id="form-erro" class="msg-erro" role="alert" hidden></p>
      <p id="form-ok" class="msg-ok" role="status" hidden></p>
      <button type="submit" class="botao botao-principal botao-cheio">Enviar link</button>
    </form>

    <p class="form-rodape"><a href="#/login">Voltar para o login</a></p>
  </div>
</main>
`);
    const { achar, mostrarErro } = Sabor.tela;
    const form = achar("[data-form='esqueci']", raiz);
    const erro = achar("#form-erro", raiz);
    const ok = achar("#form-ok", raiz);
    const botao = achar("button[type=submit]", form);

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      ok.hidden = true;
      botao.disabled = true;
      try {
        const r = await Sabor.api.esqueci(form.elements.email.value);
        ok.textContent = r.mensagem;
        ok.hidden = false;
        if (r.link) {
          ok.append(" ", Sabor.tela.criar("a", { href: r.link.slice(r.link.indexOf("#")), text: "Abrir link (modo de teste)" }));
        }
      } catch (falha) {
        mostrarErro(erro, falha.message);
      }
      botao.disabled = false;
    });
  },
};
