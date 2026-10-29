Sabor.telas.login = {
  titulo: "Entrar",
  ativa: null,
  soVisitante: true,
  simples: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<section class="topo">
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
`);
    const { achar, mostrarErro, destinoSeguro } = Sabor.tela;
    function travar(form, travado, textoOcupado) {
      const botao = achar("button[type=submit]", form);
      if (travado) {
        botao.dataset.texto = botao.textContent;
        botao.textContent = textoOcupado;
      } else if (botao.dataset.texto) {
        botao.textContent = botao.dataset.texto;
      }
      botao.disabled = travado;
    }

    function manterDestino(id, pagina) {
      const link = achar(id, raiz);
      if (link && params.has("next")) link.href = pagina + "?next=" + encodeURIComponent(params.get("next"));
    }

    const form = achar("[data-form='login']", raiz);

    const erro = achar("#form-erro", raiz);
    manterDestino("#link-cadastro", "#/cadastro");
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      travar(form, true, "Entrando...");
      try {
        const campos = Object.fromEntries(new FormData(form));
        const { token, cliente } = await Sabor.api.login(campos.email, campos.senha);
        Sabor.dados.sessao.entrar(token, cliente, form.elements.lembrar.checked);
        Sabor.rota.ir(destinoSeguro(params));
      } catch (falha) {
        mostrarErro(erro, falha.message);
        travar(form, false);
      }
    });
  },
};
