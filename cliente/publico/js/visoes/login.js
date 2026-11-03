window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.login = {
  molde: `
<section class="topo" aria-label="Apresentação">
  <div class="conteudo">
    <h1>Comida de verdade, feita com amor</h1>
    <p>O tempero caseiro que você já conhece, agora na sua porta.</p>
  </div>
</section>

<main class="conteudo">
  <div class="cartao-form">
    <h2>Bem-vindo de volta!</h2>
    <p class="subtitulo">Faça login para continuar seu pedido</p>

    <form data-form="login">
      <div class="campo">
        <label for="email">E-mail</label>
        <input type="email" id="email" name="email" placeholder="seuemail@exemplo.com.br" autocomplete="email" required>
      </div>
      <div class="campo">
        <label for="senha">Senha</label>
        <input type="password" id="senha" name="senha" placeholder="Digite sua senha" autocomplete="current-password" required>
      </div>
      <div class="form-extra">
        <label><input type="checkbox" name="lembrar" checked> Lembrar de mim</label>
        <a href="#/esqueci">Esqueci minha senha</a>
      </div>
      <p id="form-erro" class="msg-erro" role="alert" hidden></p>
      <button type="submit" class="botao botao-principal botao-cheio">Entrar</button>
    </form>

    <p class="form-rodape">Não tem conta? <a href="#/cadastro" id="link-cadastro">Cadastre-se</a></p>
    <p class="form-rodape"><a href="#/home">Continuar sem entrar</a></p>
  </div>
</main>
`,
};
