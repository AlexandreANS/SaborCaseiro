window.Adm = window.Adm || {};
Adm.controle = Adm.controle || {};

document.addEventListener("DOMContentLoaded", () => {
  const tela = Adm.controle[document.body.dataset.pagina];
  if (tela) tela.montar();
});
