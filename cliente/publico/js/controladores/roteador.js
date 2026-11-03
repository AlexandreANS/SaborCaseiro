window.Sabor = window.Sabor || {};
Sabor.controle = {};

Sabor.rota = (function () {
  let limpezas = [];

  function ler() {
    const bruto = location.hash.replace(/^#/, "");
    const [caminho, consulta = ""] = bruto.split("?");
    const nome = caminho.replace(/^\/+/, "");
    return { nome, params: new URLSearchParams(consulta) };
  }

  function ir(destino, substituir = false) {
    const alvo = "#" + destino;
    if (location.hash === alvo) return abrir();
    if (substituir) location.replace(alvo);
    else location.hash = alvo;
  }

  function aoSair(funcao) {
    limpezas.push(funcao);
  }

  function repetir(funcao, ms) {
    const id = setInterval(() => {
      if (!document.hidden) funcao();
    }, ms);
    const voltou = () => {
      if (!document.hidden) funcao();
    };
    document.addEventListener("visibilitychange", voltou);
    aoSair(() => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", voltou);
    });
  }

  function ouvir(caminho, funcao) {
    aoSair(Sabor.api.tempoReal(caminho, funcao));
  }

  function limpar() {
    limpezas.forEach((funcao) => {
      try {
        funcao();
      } catch {}
    });
    limpezas = [];
  }

  async function abrir() {
    limpar();
    const { nome, params } = ler();
    const logado = Sabor.sessao.logado();
    if (!nome) return ir("/home", true);
    const tela = Sabor.controle[nome];
    if (!tela) return ir("/home", true);
    if (tela.exigeLogin && !logado) return ir("/login?next=" + encodeURIComponent(location.hash.slice(1)), true);
    if (tela.soVisitante && logado) return ir(Sabor.app.destinoSeguro(params), true);

    document.title = tela.titulo + " — Sabor Caseiro";
    Sabor.app.cabecalho(tela.ativa, !!tela.simples);
    const raiz = Dom.criar("div", { class: "tela" });
    Dom.achar("#app").replaceChildren(raiz);
    window.scrollTo(0, 0);
    await tela.montar(raiz, params);
    focarTitulo(raiz);
  }

  function focarTitulo(raiz) {
    const titulo = raiz.querySelector("h1, h2");
    if (!titulo) return;
    titulo.setAttribute("tabindex", "-1");
    titulo.focus({ preventScroll: true });
  }

  function iniciar() {
    window.addEventListener("hashchange", abrir);
    abrir();
  }

  return { ir, abrir, aoSair, repetir, ouvir, iniciar };
})();
