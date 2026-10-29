window.Sabor = window.Sabor || {};
Sabor.telas = {};

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
    const id = setInterval(() => { if (!document.hidden) funcao(); }, ms);
    const voltou = () => { if (!document.hidden) funcao(); };
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
    limpezas.forEach((funcao) => { try { funcao(); } catch {} });
    limpezas = [];
  }

  async function abrir() {
    limpar();
    const { nome, params } = ler();
    const logado = Sabor.dados.sessao.logado();
    if (!nome) return ir("/home", true);
    const tela = Sabor.telas[nome];
    if (!tela) return ir("/home", true);
    if (tela.exigeLogin && !logado) return ir("/login?next=" + encodeURIComponent(location.hash.slice(1)), true);
    if (tela.soVisitante && logado) return ir(Sabor.tela.destinoSeguro(params), true);

    document.title = tela.titulo + " — Sabor Caseiro";
    Sabor.tela.cabecalho(tela.ativa, !!tela.simples);
    const raiz = Sabor.tela.criar("div", { class: "tela" });
    Sabor.tela.achar("#app").replaceChildren(raiz);
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
