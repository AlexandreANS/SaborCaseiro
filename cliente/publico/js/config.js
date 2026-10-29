(function () {
  const API_FIXA = "";

  function lerLocal(chave) {
    try { return localStorage.getItem(chave); } catch { return null; }
  }
  function gravarLocal(chave, valor) {
    try { valor ? localStorage.setItem(chave, valor) : localStorage.removeItem(chave); } catch {}
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has("api")) gravarLocal("sabor.api", params.get("api"));

  const porHttp = /^https?:$/.test(window.location.protocol);
  const padrao = "http://" + (porHttp ? window.location.hostname : "localhost") + ":3000";
  const base = lerLocal("sabor.api") || API_FIXA || padrao;

  window.SABOR_CONFIG = { API: base.replace(/\/+$/, "") + "/api" };
})();
