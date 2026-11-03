window.Adm = window.Adm || {};

Adm.app = (function () {
  const { aviso } = Dom;

  async function tentar(acao, ok) {
    try {
      const r = await acao();
      if (ok) aviso(ok);
      return r === undefined ? true : r;
    } catch (erro) {
      aviso(erro.message, "erro");
      return false;
    }
  }

  async function excluir(remover, id, ok) {
    try {
      await remover(id);
      aviso(ok);
      return true;
    } catch (falha) {
      if (!(falha.dados && falha.dados.confirmar)) {
        aviso(falha.message, "erro");
        return false;
      }
      if (!confirm(falha.message + "\n\nExcluir mesmo assim?")) return false;
      return tentar(() => remover(id, true), ok);
    }
  }

  function sair(ev) {
    ev.preventDefault();
    Adm.sessao.sair();
    location.href = "login.html";
  }

  function iniciar(ativa, titulo, subtitulo, extra) {
    if (!Adm.sessao.token()) {
      location.replace("login.html");
      return false;
    }
    Adm.visao.base.layout({ ativa, titulo, subtitulo, extra, gerente: Adm.sessao.gerente() || { nome: "Gerente" }, aoSair: sair });
    return true;
  }

  function repetir(funcao, ms) {
    setInterval(() => {
      if (!document.hidden) funcao();
    }, ms);
  }

  return { tentar, excluir, iniciar, repetir };
})();
