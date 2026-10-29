Sabor.telas.conta = {
  titulo: "Minha Conta",
  ativa: "conta",
  exigeLogin: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<main class="conteudo conta">
  <h1 class="titulo-pagina">Minha Conta</h1>

  <form class="etapa" data-form="dados">
    <div class="etapa-topo"><h3>Meus dados</h3></div>
    <div class="linha-campos">
      <div class="campo"><label for="nome">Nome</label><input type="text" id="nome" name="nome" autocomplete="name" required></div>
      <div class="campo"><label for="telefone">Telefone</label><input type="tel" id="telefone" name="telefone" autocomplete="tel" inputmode="tel" required></div>
    </div>
    <div class="campo"><label for="email">E-mail</label><input type="email" id="email" name="email" autocomplete="email" required></div>
    <p id="erro-dados" class="msg-erro" role="alert" hidden></p>
    <button type="submit" class="botao botao-principal">Salvar dados</button>
  </form>

  <form class="etapa" data-form="senha">
    <div class="etapa-topo"><h3>Alterar senha</h3></div>
    <div class="linha-campos">
      <div class="campo"><label for="senha_atual">Senha atual</label><input type="password" id="senha_atual" name="senha_atual" autocomplete="current-password" required></div>
      <div class="campo"><label for="nova_senha">Nova senha</label><input type="password" id="nova_senha" name="nova_senha" minlength="6" autocomplete="new-password" required></div>
    </div>
    <p id="erro-senha" class="msg-erro" role="alert" hidden></p>
    <button type="submit" class="botao botao-contorno">Alterar senha</button>
  </form>

  <form class="etapa zona-perigo" data-form="excluir">
    <div class="etapa-topo"><h3>Excluir conta</h3></div>
    <p class="etapa-dica sem-recuo">Seus dados pessoais e endereço serão apagados. Pedidos antigos ficam apenas como registro do restaurante, sem ligação com você. Esta ação não pode ser desfeita.</p>
    <div class="campo"><label for="senha_excluir">Confirme sua senha</label><input type="password" id="senha_excluir" name="senha" autocomplete="current-password" required></div>
    <p id="erro-excluir" class="msg-erro" role="alert" hidden></p>
    <button type="submit" class="botao botao-perigo">Excluir minha conta</button>
  </form>

  <button type="button" class="botao botao-leve botao-cheio" id="botao-sair">Sair da conta</button>
</main>
`);
    const { achar, aviso, mostrarErro, exigirLogin } = Sabor.tela;
    const { sessao } = Sabor.dados;

    const formDados = achar("[data-form='dados']", raiz);
    const formSenha = achar("[data-form='senha']", raiz);
    const formExcluir = achar("[data-form='excluir']", raiz);

    async function enviar(form, erro, acao, ok) {
      mostrarErro(achar(erro), "");
      const botao = achar("button[type=submit]", form);
      botao.disabled = true;
      try {
        await acao();
        if (ok) aviso(ok, "ok");
      } catch (falha) {
        if (falha.status === 401 && !sessao.logado()) return exigirLogin();
        mostrarErro(achar(erro), falha.message);
      }
      botao.disabled = false;
    }

    try {
      const cliente = await Sabor.api.eu();
      sessao.atualizarCliente(cliente);
      formDados.elements.nome.value = cliente.nome;
      formDados.elements.telefone.value = cliente.telefone;
      formDados.elements.email.value = cliente.email;
    } catch (falha) {
      if (falha.status === 401) return exigirLogin();
      mostrarErro(achar("#erro-dados", raiz), falha.message);
    }

    formDados.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const c = formDados.elements;
      enviar(formDados, "#erro-dados", async () => {
        const cliente = await Sabor.api.editarConta({ nome: c.nome.value, telefone: c.telefone.value, email: c.email.value });
        sessao.atualizarCliente(cliente);
      }, "Dados atualizados!");
    });

    formSenha.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const c = formSenha.elements;
      const d = formDados.elements;
      enviar(formSenha, "#erro-senha", async () => {
        await Sabor.api.editarConta({
          nome: d.nome.value, telefone: d.telefone.value, email: d.email.value,
          senha_atual: c.senha_atual.value, nova_senha: c.nova_senha.value,
        });
        formSenha.reset();
      }, "Senha alterada!");
    });

    formExcluir.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!confirm("Tem certeza que deseja excluir sua conta? Não é possível desfazer.")) return;
      enviar(formExcluir, "#erro-excluir", async () => {
        await Sabor.api.excluirConta(formExcluir.elements.senha.value);
        sessao.sair();
        Sabor.dados.carrinho.limpar();
        Sabor.rota.ir("/login");
      });
    });

    achar("#botao-sair", raiz).addEventListener("click", () => {
      sessao.sair();
      Sabor.rota.ir("/login");
    });
  },
};
