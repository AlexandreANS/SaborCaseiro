Sabor.telas.cadastro = {
  titulo: "Criar conta",
  ativa: null,
  soVisitante: true,
  simples: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<section class="topo">
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

    const form = achar("[data-form='cadastro']", raiz);

    const erro = achar("#form-erro", raiz);
    manterDestino("#link-login", "#/login");
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      const campos = Object.fromEntries(new FormData(form));
      if (campos.senha !== campos.confirmar_senha) return mostrarErro(erro, "As senhas não conferem.");
      travar(form, true, "Criando conta...");
      try {
        const { token, cliente } = await Sabor.api.cadastrar({
          nome: campos.nome, email: campos.email, telefone: campos.telefone, senha: campos.senha,
        });
        Sabor.dados.sessao.entrar(token, cliente, true);
        Sabor.rota.ir(destinoSeguro(params));
      } catch (falha) {
        mostrarErro(erro, falha.message);
        travar(form, false);
      }
    });
  },
};
