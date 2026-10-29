window.Sabor = window.Sabor || {};

Sabor.dados = (function () {
  const memoria = {};

  function ler(area, chave) {
    try { return window[area].getItem(chave); } catch { return memoria[area + chave] ?? null; }
  }
  function gravar(area, chave, valor) {
    try {
      if (valor === null) window[area].removeItem(chave); else window[area].setItem(chave, valor);
    } catch { memoria[area + chave] = valor; }
  }
  function lerJson(area, chave, padrao) {
    try { return JSON.parse(ler(area, chave)) ?? padrao; } catch { return padrao; }
  }
  const avisar = () => document.dispatchEvent(new CustomEvent("sabor:mudou"));

  const sessao = {
    token() { return ler("localStorage", "sabor.token") || ler("sessionStorage", "sabor.token"); },
    cliente() {
      return lerJson("localStorage", "sabor.cliente", null) || lerJson("sessionStorage", "sabor.cliente", null);
    },
    logado() { return !!sessao.token(); },
    entrar(token, cliente, lembrar = true) {
      sessao.sair(false);
      const area = lembrar ? "localStorage" : "sessionStorage";
      gravar(area, "sabor.token", token);
      gravar(area, "sabor.cliente", JSON.stringify(cliente));
      avisar();
    },
    atualizarCliente(cliente) {
      const area = ler("localStorage", "sabor.token") ? "localStorage" : "sessionStorage";
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

  const carrinho = {
    itens() { return lerJson("localStorage", "sabor.carrinho", []); },
    salvar(itens) { gravar("localStorage", "sabor.carrinho", JSON.stringify(itens)); avisar(); },
    adicionar(item) {
      const itens = carrinho.itens();
      itens.push({ ...item, uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
      carrinho.salvar(itens);
    },
    alterarQuantidade(uid, delta) {
      carrinho.salvar(carrinho.itens().map((i) =>
        i.uid === uid ? { ...i, quantidade: Math.min(20, Math.max(1, i.quantidade + delta)) } : i));
    },
    quantidadeExtra(id) {
      const achado = carrinho.itens().find((i) => i.extra_id === id);
      return achado ? achado.quantidade : 0;
    },
    definirExtra(extra, quantidade) {
      const resto = carrinho.itens().filter((i) => i.extra_id !== extra.id);
      const atual = carrinho.itens().find((i) => i.extra_id === extra.id);
      const q = Math.min(20, Math.max(0, quantidade));
      if (q > 0) resto.push({ ...(atual || { uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }), extra_id: extra.id, titulo: extra.nome, preco: extra.preco, quantidade: q });
      carrinho.salvar(resto);
    },
    remover(uid) { carrinho.salvar(carrinho.itens().filter((i) => i.uid !== uid)); },
    limpar() { carrinho.salvar([]); gravar("localStorage", "sabor.cupom", null); },
    total() { return carrinho.itens().reduce((soma, i) => soma + i.quantidade, 0); },
    cupom() { return ler("localStorage", "sabor.cupom") || ""; },
    definirCupom(codigo) { gravar("localStorage", "sabor.cupom", codigo || null); },
    reconciliar(cardapio) {
      if (!cardapio.publicado) return [];
      const fora = [];
      const bons = carrinho.itens().filter((i) => {
        let ok;
        if (i.extra_id) ok = cardapio.extras.some((e) => e.id === i.extra_id);
        else {
          const tipo = cardapio.tipos.find((t) => t.id === i.tipo_id);
          const ids = tipo ? tipo.categorias.flatMap((c) => c.opcoes.map((o) => o.id)) : [];
          ok = !!tipo && i.ingredientes.every((x) => ids.includes(x));
        }
        if (!ok) fora.push(i.titulo);
        return ok;
      });
      if (fora.length) carrinho.salvar(bons);
      return fora;
    },
    paraApi() {
      return carrinho.itens().map((i) => i.extra_id
        ? { extra_id: i.extra_id, quantidade: i.quantidade }
        : { tipo_id: i.tipo_id, ingredientes: i.ingredientes, quantidade: i.quantidade, observacoes: i.observacoes });
    },
  };

  return { sessao, carrinho };
})();
