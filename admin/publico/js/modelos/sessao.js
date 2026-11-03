window.Adm = window.Adm || {};

Adm.sessao = {
  token() {
    try {
      return localStorage.getItem("adm.token");
    } catch {
      return null;
    }
  },
  gerente() {
    try {
      return JSON.parse(localStorage.getItem("adm.gerente"));
    } catch {
      return null;
    }
  },
  entrar(token, gerente) {
    try {
      localStorage.setItem("adm.token", token);
      localStorage.setItem("adm.gerente", JSON.stringify(gerente));
    } catch {}
  },
  sair() {
    try {
      localStorage.removeItem("adm.token");
      localStorage.removeItem("adm.gerente");
    } catch {}
  },
};
