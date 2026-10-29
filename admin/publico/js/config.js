(function () {
  function lerLocal(chave) {
    try { return localStorage.getItem(chave); } catch { return null; }
  }
  const params = new URLSearchParams(window.location.search);
  if (params.has("api")) {
    try { localStorage.setItem("adm.api", params.get("api")); } catch {}
  }
  const porHttp = /^https?:$/.test(window.location.protocol);
  const padrao = "http://" + (porHttp ? window.location.hostname : "localhost") + ":3000";
  const base = lerLocal("adm.api") || padrao;
  window.ADM_CONFIG = { API: base.replace(/\/+$/, "") + "/api/gestao" };
})();
