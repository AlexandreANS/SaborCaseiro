window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.esqueci = {
  molde: `
<section class="topo" aria-label="Apresentação">
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
`,
};
