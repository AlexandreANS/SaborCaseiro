const pool = require("../config/database");
const cardapio = require("./cardapio");

const ABERTOS = "('Esperando','Preparando','Saiu para Entrega','Pronto para Retirada')";

async function noCardapio(tabela, coluna, id) {
  const dia = await cardapio.hoje();
  const { rows } = await pool.query(
    `SELECT 1 FROM ${tabela} t JOIN cardapio_dia c ON c.data = t.data WHERE c.publicado AND t.data = $1 AND t.${coluna} = $2`,
    [dia, id]
  );
  return rows.length > 0;
}

async function abertos(sql, id) {
  const { rows } = await pool.query(sql, [id]);
  return rows[0].n;
}

function frase(nome, menu, andamento) {
  if (menu && andamento) return `Este ${nome} está no cardápio publicado de hoje e em ${andamento} pedido(s) em andamento.`;
  if (menu) return `Este ${nome} está no cardápio publicado de hoje.`;
  if (andamento) return `Este ${nome} está em ${andamento} pedido(s) em andamento.`;
  return null;
}

async function avisoTipo(id) {
  const andamento = await abertos(
    `SELECT count(DISTINCT p.id)::int AS n FROM pedidos p JOIN pedido_itens i ON i.pedido_id = p.id WHERE i.tipo_id = $1 AND p.status IN ${ABERTOS}`,
    id
  );
  return frase("tipo", await noCardapio("cardapio_dia_tipos", "tipo_id", id), andamento);
}

async function avisoProduto(id) {
  const andamento = await abertos(
    `SELECT count(DISTINCT p.id)::int AS n FROM pedidos p JOIN pedido_itens i ON i.pedido_id = p.id
      WHERE p.status IN ${ABERTOS} AND (i.produto_id = $1 OR EXISTS (SELECT 1 FROM pedido_item_ingredientes x WHERE x.item_id = i.id AND x.ingrediente_id = $1))`,
    id
  );
  return frase("produto", await noCardapio("cardapio_dia_produtos", "ingrediente_id", id), andamento);
}

async function avisoBairro(id) {
  const andamento = await abertos(`SELECT count(*)::int AS n FROM pedidos WHERE bairro_id = $1 AND status IN ${ABERTOS}`, id);
  return andamento ? `Este bairro tem ${andamento} pedido(s) em andamento.` : null;
}

module.exports = { avisoTipo, avisoProduto, avisoBairro };
