window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.redefinir = {
  molde: `
<section class="topo" aria-label="Apresentação">
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
`,
};
