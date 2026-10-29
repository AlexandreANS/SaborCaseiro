const express = require("express");
const pool = require("../config/database");
const { lerSessao } = require("../util/seguranca");
const { cotar } = require("../util/precos");
const { publicadoHoje, hoje } = require("../util/cardapio");
const { estado } = require("../util/funcionamento");
const { lerLoja } = require("../util/loja");
const { ErroApi } = require("../util/erros");

const rotas = express.Router();

const TITULOS = {
  carboidrato: "Escolha os Carboidratos",
  proteina: "Escolha a Proteína Principal",
  acompanhamento: "Acompanhamentos",
  salada: "Saladas Verdes e Legumes",
};

async function listarBairros() {
  const { rows } = await pool.query("SELECT id, nome, taxa_entrega::float FROM bairros WHERE ativo ORDER BY nome");
  return rows;
}

rotas.get("/cardapio", async (req, res) => {
  const bairros = await listarBairros();
  const menu = await publicadoHoje();
  if (!menu) {
    const dia = await hoje();
    const prox = await pool.query("SELECT to_char(data, 'YYYY-MM-DD') AS data FROM cardapio_dia WHERE publicado AND data > $1 ORDER BY data LIMIT 1", [dia]);
    return res.json({ publicado: false, tipos: [], extras: [], bairros, proximo: prox.rows[0] ? prox.rows[0].data : null });
  }

  const tipos = await pool.query("SELECT id, nome, descricao, preco::float FROM tipos_marmita WHERE ativo AND id = ANY($1) ORDER BY ordem, id", [[...menu.tipoIds]]);
  const cats = await pool.query("SELECT tipo_id, categoria, ordem, minimo, maximo FROM tipo_categorias WHERE categoria <> 'extra' ORDER BY tipo_id, ordem");
  const vinculos = await pool.query(
    `SELECT ti.tipo_id, i.id, i.nome, i.categoria, i.preco_extra::float
       FROM tipo_ingredientes ti JOIN ingredientes i ON i.id = ti.ingrediente_id
      WHERE i.ativo AND i.categoria <> 'extra' AND i.id = ANY($1) ORDER BY i.id`,
    [[...menu.produtoIds]]
  );
  const extras = await pool.query(
    "SELECT id, nome, categoria, preco_extra::float FROM ingredientes WHERE ativo AND categoria = 'extra' AND id = ANY($1) ORDER BY id",
    [[...menu.produtoIds]]
  );

  const lista = tipos.rows.map((tipo) => ({
    ...tipo,
    categorias: cats.rows
      .filter((c) => c.tipo_id === tipo.id)
      .map((c) => ({
        categoria: c.categoria,
        titulo: TITULOS[c.categoria] || c.categoria,
        minimo: c.minimo,
        maximo: c.maximo,
        opcoes: vinculos.rows.filter((v) => v.tipo_id === tipo.id && v.categoria === c.categoria).map(({ id, nome, preco_extra }) => ({ id, nome, preco_extra })),
      }))
      .filter((c) => c.opcoes.length > 0 || c.minimo === 0),
  }));

  res.json({
    publicado: true, data: menu.data, tipos: lista, bairros,
    extras: extras.rows.map(({ id, nome, preco_extra }) => ({ id, nome, preco: preco_extra })),
  });
});

rotas.get("/funcionamento", async (req, res) => {
  res.json(await estado());
});

rotas.get("/loja", async (req, res) => {
  res.json({ ...(await lerLoja()), funcionamento: await estado() });
});

rotas.get("/bairros", async (req, res) => {
  res.json(await listarBairros());
});

rotas.post("/carrinho/cotacao", lerSessao, async (req, res) => {
  const { itens, tipo_entrega, bairro_id, cupom } = req.body || {};
  if (tipo_entrega && !["entrega", "retirada"].includes(tipo_entrega)) throw new ErroApi("Tipo de entrega inválido.");
  const cotacao = await cotar(itens, { tipo_entrega: tipo_entrega || "entrega", bairro_id, cupom, clienteId: req.clienteId });
  res.json(cotacao);
});

module.exports = rotas;
