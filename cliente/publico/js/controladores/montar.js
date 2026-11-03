Sabor.controle.montar = {
  titulo: "Monte sua Marmita",
  ativa: "montar",
  async montar(raiz, params) {
    const { aviso } = Dom;
    const { desenhar, semCardapio } = Sabor.visao.base;
    const visao = Sabor.visao.montar;
    desenhar(raiz, visao.molde);

    const estado = { tipo: null, escolhas: {}, extras: {}, obs: "" };
    let cardapio;

    try {
      cardapio = await Sabor.api.cardapio();
    } catch (erro) {
      return visao.aviso(raiz, erro.message, () => Sabor.rota.abrir());
    }
    if (!cardapio.tipos.length) return visao.aviso(raiz, semCardapio(cardapio));
    estado.tipo = cardapio.tipos[0];

    const marcados = (cat) => estado.escolhas[cat.categoria] || [];
    const extrasDe = (cat) => estado.extras[cat.categoria] || [];
    const folga = (cat) => cat.maximo - cat.minimo;
    const qtdExtra = (cat, id) => extrasDe(cat).filter((x) => x === id).length;
    const nomeCurto = (cat) => cat.titulo.replace(/^Escolha (os |a )?/, "").replace(/^Saladas Verdes e Legumes$/, "Salada");
    const buscar = (cat, id) => cat.opcoes.find((o) => o.id === id);

    const faltam = () => estado.tipo.categorias.filter((c) => marcados(c).length < c.minimo).map((c) => nomeCurto(c).toLowerCase());

    function escolhidos(porCategoria) {
      return estado.tipo.categorias.flatMap((cat) =>
        porCategoria(cat)
          .map((id) => ({ cat, op: buscar(cat, id) }))
          .filter((x) => x.op)
      );
    }
    const principais = () => escolhidos(marcados);
    const adicionais = () => escolhidos(extrasDe);

    const subtotal = () => estado.tipo.preco + adicionais().reduce((soma, x) => soma + x.op.preco_extra, 0);

    function resumoExtras() {
      const contagem = new Map();
      for (const x of adicionais()) contagem.set(x.op, (contagem.get(x.op) || 0) + 1);
      return [...contagem].map(([op, n]) => (n > 1 ? n + "× " : "") + op.nome).join(", ");
    }

    function alternar(cat, opcao) {
      const lista = [...marcados(cat)];
      const pos = lista.indexOf(opcao.id);
      if (pos >= 0) lista.splice(pos, 1);
      else if (cat.minimo === 1) lista.splice(0, lista.length, opcao.id);
      else if (lista.length >= cat.minimo) return aviso(`Aqui você escolhe ${cat.minimo} opções. Para levar mais, use os extras.`, "info");
      else lista.push(opcao.id);
      estado.escolhas[cat.categoria] = lista;
      desenharTudo();
    }

    function mudarExtra(cat, opcao, delta) {
      const lista = [...extrasDe(cat)];
      if (delta > 0) {
        if (lista.length >= folga(cat))
          return aviso(`Cabem no máximo ${folga(cat)} ${folga(cat) === 1 ? "extra" : "extras"} aqui.`, "info");
        lista.push(opcao.id);
      } else {
        const pos = lista.indexOf(opcao.id);
        if (pos < 0) return;
        lista.splice(pos, 1);
      }
      estado.extras[cat.categoria] = lista;
      desenharTudo();
    }

    function trocarTipo(tipo) {
      estado.tipo = tipo;
      estado.escolhas = {};
      estado.extras = {};
      desenharTudo();
    }

    function adicionar() {
      const tipo = estado.tipo;
      const extras = adicionais();
      Sabor.carrinho.adicionar({
        tipo_id: tipo.id,
        ingredientes: principais().map((x) => x.op.id),
        adicionais: extras.map((x) => x.op.id),
        quantidade: 1,
        observacoes: estado.obs.trim() || null,
        titulo: tipo.nome,
        descricao:
          principais()
            .map((x) => x.op.nome)
            .join(", ") + (extras.length ? " · Extras: " + resumoExtras() : ""),
      });
      visao.adicionado(raiz);
      setTimeout(() => Sabor.rota.ir("/carrinho"), 500);
    }

    const acoes = {
      trocarTipo,
      alternar,
      mudarExtra,
      adicionar,
      observar: (texto) => {
        estado.obs = texto;
      },
    };

    function desenharTudo() {
      const tipo = estado.tipo;
      visao.passos(raiz, { tipos: cardapio.tipos, tipo, obs: estado.obs, marcados, extrasDe, qtdExtra }, acoes);
      visao.resumo(
        raiz,
        {
          subtotal: subtotal(),
          falta: faltam(),
          linhas: [
            ["Tipo", tipo.nome],
            ...tipo.categorias.map((c) => [
              nomeCurto(c),
              marcados(c)
                .map((id) => buscar(c, id)?.nome)
                .filter(Boolean)
                .join(", ") || "—",
            ]),
            ...(adicionais().length ? [["Extras", resumoExtras()]] : []),
          ],
        },
        acoes
      );
    }

    desenharTudo();
  },
};
