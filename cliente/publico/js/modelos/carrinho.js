window.Sabor = window.Sabor || {};

Sabor.carrinho = (function () {
  const { ler, gravar, lerJson, avisar } = Sabor.armazem;

  const carrinho = {
    itens() {
      return lerJson("localStorage", "sabor.carrinho", []);
    },
    salvar(itens) {
      gravar("localStorage", "sabor.carrinho", JSON.stringify(itens));
      avisar();
    },
    adicionar(item) {
      const itens = carrinho.itens();
      itens.push({ ...item, uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) });
      carrinho.salvar(itens);
    },
    alterarQuantidade(uid, delta) {
      carrinho.salvar(
        carrinho.itens().map((i) => (i.uid === uid ? { ...i, quantidade: Math.min(20, Math.max(1, i.quantidade + delta)) } : i))
      );
    },
    quantidadeExtra(id) {
      const achado = carrinho.itens().find((i) => i.extra_id === id);
      return achado ? achado.quantidade : 0;
    },
    definirExtra(extra, quantidade) {
      const resto = carrinho.itens().filter((i) => i.extra_id !== extra.id);
      const atual = carrinho.itens().find((i) => i.extra_id === extra.id);
      const q = Math.min(20, Math.max(0, quantidade));
      if (q > 0)
        resto.push({
          ...(atual || { uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }),
          extra_id: extra.id,
          titulo: extra.nome,
          preco: extra.preco,
          quantidade: q,
        });
      carrinho.salvar(resto);
    },
    remover(uid) {
      carrinho.salvar(carrinho.itens().filter((i) => i.uid !== uid));
    },
    limpar() {
      carrinho.salvar([]);
      gravar("localStorage", "sabor.cupom", null);
    },
    total() {
      return carrinho.itens().reduce((soma, i) => soma + i.quantidade, 0);
    },
    cupom() {
      return ler("localStorage", "sabor.cupom") || "";
    },
    definirCupom(codigo) {
      gravar("localStorage", "sabor.cupom", codigo || null);
    },
    reconciliar(cardapio) {
      if (!cardapio.publicado) return [];
      const fora = [];
      const bons = carrinho.itens().filter((i) => {
        let ok;
        if (i.extra_id) ok = cardapio.extras.some((e) => e.id === i.extra_id);
        else {
          const tipo = cardapio.tipos.find((t) => t.id === i.tipo_id);
          const ids = tipo ? tipo.categorias.flatMap((c) => c.opcoes.map((o) => o.id)) : [];
          const regras = tipo ? tipo.categorias : [];
          const doTipo = (x) => regras.find((c) => c.opcoes.some((o) => o.id === x));
          const principais = (i.ingredientes || []).map(doTipo);
          const extras = (i.adicionais || []).map(doTipo);
          ok =
            !!tipo &&
            [...(i.ingredientes || []), ...(i.adicionais || [])].every((x) => ids.includes(x)) &&
            regras.every(
              (c) =>
                principais.filter((x) => x === c).length === c.minimo &&
                principais.filter((x) => x === c).length + extras.filter((x) => x === c).length <= c.maximo
            );
        }
        if (!ok) fora.push(i.titulo);
        return ok;
      });
      if (fora.length) carrinho.salvar(bons);
      return fora;
    },
    paraApi() {
      return carrinho.itens().map((i) =>
        i.extra_id
          ? { extra_id: i.extra_id, quantidade: i.quantidade }
          : {
              tipo_id: i.tipo_id,
              ingredientes: i.ingredientes,
              adicionais: i.adicionais || [],
              quantidade: i.quantidade,
              observacoes: i.observacoes,
            }
      );
    },
  };

  return carrinho;
})();
