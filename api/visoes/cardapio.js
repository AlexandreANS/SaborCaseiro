const TITULOS = {
  carboidrato: "Escolha os Carboidratos",
  proteina: "Escolha a Proteína Principal",
  acompanhamento: "Acompanhamentos",
  salada: "Saladas Verdes e Legumes",
};

function fechado(bairros, proximo) {
  return { publicado: false, tipos: [], extras: [], bairros, proximo };
}

function aberto({ menu, tipos, categorias, vinculos, extras, bairros }) {
  const lista = tipos.map((tipo) => ({
    ...tipo,
    categorias: categorias
      .filter((c) => c.tipo_id === tipo.id)
      .map((c) => ({
        categoria: c.categoria,
        titulo: TITULOS[c.categoria] || c.categoria,
        minimo: c.minimo,
        maximo: c.maximo,
        opcoes: vinculos
          .filter((v) => v.tipo_id === tipo.id && v.categoria === c.categoria)
          .map(({ id, nome, preco_extra }) => ({ id, nome, preco_extra })),
      }))
      .filter((c) => c.opcoes.length > 0 || c.minimo === 0),
  }));
  return {
    publicado: true,
    data: menu.data,
    tipos: lista,
    bairros,
    extras: extras.map(({ id, nome, preco_extra }) => ({ id, nome, preco: preco_extra })),
  };
}

module.exports = { fechado, aberto };
