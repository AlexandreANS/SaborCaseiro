const pool = require("../config/database");
const { ErroApi } = require("./erros");
const { hoje } = require("./cardapio");

const ABERTOS = "('Esperando','Preparando','Saiu para Entrega','Pronto para Retirada')";

async function noCardapio(tabela, coluna, id) {
  const dia = await hoje();
  const { rows } = await pool.query(
    `SELECT 1 FROM ${tabela} t JOIN cardapio_dia c ON c.data = t.data WHERE c.publicado AND t.data = $1 AND t.${coluna} = $2`,
    [dia, id]
  );
  return rows.length > 0;
}

async function pedidosAbertos(sql, id) {
  const { rows } = await pool.query(sql, [id]);
  return rows[0].n;
}

async function avisoTipo(id) {
  const abertos = await pedidosAbertos(
    `SELECT count(DISTINCT p.id)::int AS n FROM pedidos p JOIN pedido_itens i ON i.pedido_id = p.id WHERE i.tipo_id = $1 AND p.status IN ${ABERTOS}`, id
  );
  const menu = await noCardapio("cardapio_dia_tipos", "tipo_id", id);
  if (menu && abertos) return `Este tipo está no cardápio publicado de hoje e em ${abertos} pedido(s) em andamento.`;
  if (menu) return "Este tipo está no cardápio publicado de hoje.";
  if (abertos) return `Este tipo está em ${abertos} pedido(s) em andamento.`;
  return null;
}

async function avisoProduto(id) {
  const abertos = await pedidosAbertos(
    `SELECT count(DISTINCT p.id)::int AS n FROM pedidos p JOIN pedido_itens i ON i.pedido_id = p.id
      WHERE p.status IN ${ABERTOS} AND (i.produto_id = $1 OR EXISTS (SELECT 1 FROM pedido_item_ingredientes x WHERE x.item_id = i.id AND x.ingrediente_id = $1))`, id
  );
  const menu = await noCardapio("cardapio_dia_produtos", "ingrediente_id", id);
  if (menu && abertos) return `Este produto está no cardápio publicado de hoje e em ${abertos} pedido(s) em andamento.`;
  if (menu) return "Este produto está no cardápio publicado de hoje.";
  if (abertos) return `Este produto está em ${abertos} pedido(s) em andamento.`;
  return null;
}

async function avisoBairro(id) {
  const abertos = await pedidosAbertos(
    `SELECT count(*)::int AS n FROM pedidos WHERE bairro_id = $1 AND status IN ${ABERTOS}`, id
  );
  return abertos ? `Este bairro tem ${abertos} pedido(s) em andamento.` : null;
}

async function confirmarExclusao(req, aviso) {
  if (!aviso || req.query.forcar === "1") return;
  throw new ErroApi(aviso, 409, { confirmar: true });
}

module.exports = { avisoTipo, avisoProduto, avisoBairro, confirmarExclusao };
