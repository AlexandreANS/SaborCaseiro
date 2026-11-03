window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.cadastro = {
  molde: `
<section class="topo" aria-label="Apresentação">
  <div class="conteudo">
    <h1>Junte-se à nossa comunidade</h1>
    <p>Tenha descontos exclusivos todos os dias.</p>
  </div>
</section>

<main class="conteudo">
  <div class="cartao-form">
    <h2>Crie sua conta</h2>
    <p class="subtitulo">É rápido e fácil!</p>

    <form data-form="cadastro">
      <div class="campo">
        <label for="nome">Nome completo</label>
        <input type="text" id="nome" name="nome" placeholder="Ex: Maria Silva" autocomplete="name" required>
      </div>
      <div class="campo">
        <label for="email">E-mail</label>
        <input type="email" id="email" name="email" placeholder="seuemail@exemplo.com.br" autocomplete="email" required>
      </div>
      <div class="campo">
        <label for="telefone">Telefone</label>
        <input type="tel" id="telefone" name="telefone" placeholder="(11) 99999-9999" autocomplete="tel" inputmode="tel" required>
      </div>
      <div class="linha-campos">
        <div class="campo">
          <label for="senha">Senha</label>
          <input type="password" id="senha" name="senha" placeholder="Mínimo 6 caracteres" minlength="6" autocomplete="new-password" required>
        </div>
        <div class="campo">
          <label for="confirmar">Confirmar senha</label>
          <input type="password" id="confirmar" name="confirmar_senha" placeholder="Confirme sua senha" autocomplete="new-password" required>
        </div>
      </div>
      <label class="linha-check">
        <input type="checkbox" required>
        Li e aceito os Termos de Uso e Política de Privacidade
      </label>
      <p id="form-erro" class="msg-erro" role="alert" hidden></p>
      <button type="submit" class="botao botao-principal botao-cheio">Criar minha conta</button>
    </form>

    <p class="form-rodape">Já tem conta? <a href="#/login" id="link-login">Faça login</a></p>
  </div>
</main>
`,
};
