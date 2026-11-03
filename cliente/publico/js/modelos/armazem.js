window.Sabor = window.Sabor || {};

Sabor.armazem = (function () {
  const memoria = {};

  function ler(area, chave) {
    try {
      return window[area].getItem(chave);
    } catch {
      return memoria[area + chave] ?? null;
    }
  }
  function gravar(area, chave, valor) {
    try {
      if (valor === null) window[area].removeItem(chave);
      else window[area].setItem(chave, valor);
    } catch {
      memoria[area + chave] = valor;
    }
  }
  function lerJson(area, chave, padrao) {
    try {
      return JSON.parse(ler(area, chave)) ?? padrao;
    } catch {
      return padrao;
    }
  }
  const avisar = () => document.dispatchEvent(new CustomEvent("sabor:mudou"));

  return { ler, gravar, lerJson, avisar };
})();
