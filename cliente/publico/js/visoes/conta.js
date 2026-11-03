window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.conta = {
  molde: `
<main class="conteudo conta">
  <h1 class="titulo-pagina">Minha Conta</h1>

  <form class="etapa" data-form="dados">
    <div class="etapa-topo"><h2>Meus dados</h2></div>
    <div class="linha-campos">
      <div class="campo"><label for="nome">Nome</label><input type="text" id="nome" name="nome" autocomplete="name" required></div>
      <div class="campo"><label for="telefone">Telefone</label><input type="tel" id="telefone" name="telefone" autocomplete="tel" inputmode="tel" required></div>
    </div>
    <div class="campo"><label for="email">E-mail</label><input type="email" id="email" name="email" autocomplete="email" required></div>
    <p id="erro-dados" class="msg-erro" role="alert" hidden></p>
    <button type="submit" class="botao botao-principal">Salvar dados</button>
  </form>

  <form class="etapa" data-form="endereco">
    <div class="etapa-topo"><h2>Endereço de entrega</h2></div>
    <p class="etapa-dica sem-recuo">Fica salvo para preencher o checkout automaticamente. O bairro e a taxa vêm do CEP.</p>
    <div class="linha-campos">
      <div class="campo"><label for="cep">CEP</label><input type="text" id="cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" required><small class="suave dica-cep" id="dica-cep" aria-live="polite"></small></div>
      <div class="campo"><label for="rua">Rua / Logradouro</label><input type="text" id="rua" name="rua" autocomplete="address-line1" required></div>
    </div>
    <div class="linha-campos">
      <div class="campo"><label for="numero">Número</label><input type="text" id="numero" name="numero" required></div>
      <div class="campo"><label for="complemento">Complemento</label><input type="text" id="complemento" name="complemento" placeholder="Apto, bloco..."></div>
    </div>
    <div class="bairro-achado" id="bairro-achado" aria-live="polite">Informe o CEP para ver o bairro e a taxa de entrega.</div>
    <p id="erro-endereco" class="msg-erro" role="alert" hidden></p>
    <div class="linha-botoes">
      <button type="submit" class="botao botao-principal">Salvar endereço</button>
      <button type="button" class="botao botao-leve" id="apagar-endereco">Remover endereço</button>
    </div>
  </form>

  <form class="etapa" data-form="senha">
    <div class="etapa-topo"><h2>Alterar senha</h2></div>
    <div class="linha-campos">
      <div class="campo"><label for="senha_atual">Senha atual</label><input type="password" id="senha_atual" name="senha_atual" autocomplete="current-password" required></div>
      <div class="campo"><label for="nova_senha">Nova senha</label><input type="password" id="nova_senha" name="nova_senha" minlength="6" autocomplete="new-password" required></div>
    </div>
    <p id="erro-senha" class="msg-erro" role="alert" hidden></p>
    <button type="submit" class="botao botao-contorno">Alterar senha</button>
  </form>

  <form class="etapa zona-perigo" data-form="excluir">
    <div class="etapa-topo"><h2>Excluir conta</h2></div>
    <p class="etapa-dica sem-recuo">Seus dados pessoais e endereço serão apagados. Pedidos antigos ficam apenas como registro do restaurante, sem ligação com você. Esta ação não pode ser desfeita.</p>
    <div class="campo"><label for="senha_excluir">Confirme sua senha</label><input type="password" id="senha_excluir" name="senha" autocomplete="current-password" required></div>
    <p id="erro-excluir" class="msg-erro" role="alert" hidden></p>
    <button type="submit" class="botao botao-perigo">Excluir minha conta</button>
  </form>

  <button type="button" class="botao botao-leve botao-cheio" id="botao-sair">Sair da conta</button>
</main>
`,

  preencher(raiz, cliente) {
    const c = Dom.achar("[data-form='dados']", raiz).elements;
    c.nome.value = cliente.nome;
    c.telefone.value = cliente.telefone;
    c.email.value = cliente.email;
    const e = Dom.achar("[data-form='endereco']", raiz).elements;
    const end = cliente.endereco;
    e.cep.value = end ? end.cep || "" : "";
    e.rua.value = end ? end.rua : "";
    e.numero.value = end ? end.numero : "";
    e.complemento.value = end ? end.complemento || "" : "";
  },
};
