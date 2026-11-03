Sabor.controle.conta = {
  titulo: "Minha Conta",
  ativa: "conta",
  exigeLogin: true,
  async montar(raiz, params) {
    const { desenhar, mostrarErro } = Sabor.visao.base;
    const { achar, aviso } = Dom;
    const { sessao } = Sabor;
    desenhar(raiz, Sabor.visao.conta.molde);

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
        if (falha.status === 401 && !sessao.logado()) return Sabor.app.exigirLogin();
        mostrarErro(achar(erro), falha.message);
      }
      botao.disabled = false;
    }

    try {
      const cliente = await Sabor.api.eu();
      sessao.atualizarCliente(cliente);
      Sabor.visao.conta.preencher(raiz, cliente);
    } catch (falha) {
      if (falha.status === 401) return Sabor.app.exigirLogin();
      mostrarErro(achar("#erro-dados", raiz), falha.message);
    }

    const formEndereco = achar("[data-form='endereco']", raiz);
    const e = formEndereco.elements;
    const local = Sabor.controle.cep.ligar({
      cep: e.cep,
      rua: e.rua,
      numero: e.numero,
      dica: achar("#dica-cep", raiz),
      caixa: achar("#bairro-achado", raiz),
    });

    formEndereco.addEventListener("submit", (ev) => {
      ev.preventDefault();
      enviar(
        formEndereco,
        "#erro-endereco",
        async () => {
          if (!local.cep) throw new Sabor.ErroApi("Informe um CEP válido de um bairro atendido.", 400);
          sessao.atualizarCliente(
            await Sabor.api.salvarEndereco({ cep: local.cep, rua: e.rua.value, numero: e.numero.value, complemento: e.complemento.value })
          );
        },
        "Endereço salvo!"
      );
    });

    achar("#apagar-endereco", raiz).addEventListener("click", () => {
      enviar(
        formEndereco,
        "#erro-endereco",
        async () => {
          sessao.atualizarCliente(await Sabor.api.apagarEndereco());
          formEndereco.reset();
          e.cep.dispatchEvent(new Event("input"));
        },
        "Endereço removido."
      );
    });

    formDados.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const c = formDados.elements;
      enviar(
        formDados,
        "#erro-dados",
        async () => {
          sessao.atualizarCliente(await Sabor.api.editarConta({ nome: c.nome.value, telefone: c.telefone.value, email: c.email.value }));
        },
        "Dados atualizados!"
      );
    });

    formSenha.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const c = formSenha.elements;
      const d = formDados.elements;
      enviar(
        formSenha,
        "#erro-senha",
        async () => {
          const atualizado = await Sabor.api.editarConta({
            nome: d.nome.value,
            telefone: d.telefone.value,
            email: d.email.value,
            senha_atual: c.senha_atual.value,
            nova_senha: c.nova_senha.value,
          });
          sessao.atualizarCliente(atualizado);
          formSenha.reset();
        },
        "Senha alterada!"
      );
    });

    formExcluir.addEventListener("submit", (ev) => {
      ev.preventDefault();
      if (!confirm("Tem certeza que deseja excluir sua conta? Não é possível desfazer.")) return;
      enviar(formExcluir, "#erro-excluir", async () => {
        await Sabor.api.excluirConta(formExcluir.elements.senha.value);
        sessao.sair();
        Sabor.carrinho.limpar();
        Sabor.rota.ir("/login");
      });
    });

    achar("#botao-sair", raiz).addEventListener("click", () => {
      sessao.sair();
      Sabor.rota.ir("/login");
    });
  },
};
