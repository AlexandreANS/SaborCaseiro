window.Sabor = window.Sabor || {};

Sabor.sessao = (function () {
  const { ler, gravar, lerJson, avisar } = Sabor.armazem;

  const sessao = {
    token() {
      return ler("localStorage", "sabor.token") || ler("sessionStorage", "sabor.token");
    },
    cliente() {
      return lerJson("localStorage", "sabor.cliente", null) || lerJson("sessionStorage", "sabor.cliente", null);
    },
    logado() {
      return !!sessao.token();
    },
    entrar(token, cliente, lembrar = true) {
      sessao.sair(false);
      const area = lembrar ? "localStorage" : "sessionStorage";
      gravar(area, "sabor.token", token);
      gravar(area, "sabor.cliente", JSON.stringify(cliente));
      avisar();
    },
    trocarToken(token) {
      const area = ler("localStorage", "sabor.token") ? "localStorage" : "sessionStorage";
      gravar(area, "sabor.token", token);
    },
    atualizarCliente({ token, ...cliente }) {
      const area = ler("localStorage", "sabor.token") ? "localStorage" : "sessionStorage";
      if (token) gravar(area, "sabor.token", token);
      gravar(area, "sabor.cliente", JSON.stringify(cliente));
      avisar();
    },
    sair(notificar = true) {
      for (const area of ["localStorage", "sessionStorage"]) {
        gravar(area, "sabor.token", null);
        gravar(area, "sabor.cliente", null);
      }
      if (notificar) avisar();
    },
  };

  return sessao;
})();
