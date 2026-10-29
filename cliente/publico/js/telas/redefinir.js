Sabor.telas.redefinir = {
  titulo: "Nova senha",
  ativa: null,
  simples: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<section class="topo">
  <div class="conteudo">
    <h1>Crie uma nova senha</h1>
    <p>Escolha uma senha com pelo menos 6 caracteres.</p>
  </div>
</section>

<main class="conteudo">
  <div class="cartao-form">
    <h2>Nova senha</h2>

    <form data-form="redefinir">
      <div class="campo">
        <label for="senha">Nova senha</label>
        <input type="password" id="senha" name="senha" minlength="6" autocomplete="new-password" required>
      </div>
      <div class="campo">
        <label for="confirmar">Repita a senha</label>
        <input type="password" id="confirmar" name="confirmar" minlength="6" autocomplete="new-password" required>
      </div>
      <p id="form-erro" class="msg-erro" role="alert" hidden></p>
      <button type="submit" class="botao botao-principal botao-cheio">Salvar nova senha</button>
    </form>

    <p class="form-rodape"><a href="#/esqueci">Pedir outro link</a></p>
  </div>
</main>
`);
    const { achar, mostrarErro, aviso } = Sabor.tela;
    const form = achar("[data-form='redefinir']", raiz);
    const erro = achar("#form-erro", raiz);
    const botao = achar("button[type=submit]", form);
    const token = params.get("token");
    if (!token) mostrarErro(erro, "Link incompleto. Peça um novo link.");

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      if (form.elements.senha.value !== form.elements.confirmar.value) return mostrarErro(erro, "As senhas não conferem.");
      botao.disabled = true;
      try {
        const r = await Sabor.api.redefinir(token, form.elements.senha.value);
        Sabor.dados.sessao.sair(false);
        aviso(r.mensagem, "ok");
        Sabor.rota.ir("/login", true);
      } catch (falha) {
        mostrarErro(erro, falha.message);
        botao.disabled = false;
      }
    });
  },
};
