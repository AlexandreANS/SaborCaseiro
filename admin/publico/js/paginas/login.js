document.addEventListener("DOMContentLoaded", () => {
  const { achar } = Adm.tela;
  if (Adm.sessao.token()) {
    location.replace("pedidos.html");
    return;
  }
  const form = achar("[data-form='login']");
  const erro = achar("#erro-login");
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    erro.hidden = true;
    const botao = achar("button[type=submit]", form);
    botao.disabled = true;
    try {
      const { token, gerente } = await Adm.api.login(form.elements.email.value, form.elements.senha.value);
      Adm.sessao.entrar(token, gerente);
      location.href = "pedidos.html";
    } catch (falha) {
      erro.textContent = falha.message;
      erro.hidden = false;
      botao.disabled = false;
    }
  });
});
