const pool = require("../config/database");

async function hoje(con = pool) {
  const { rows } = await con.query("SELECT to_char((now() AT TIME ZONE 'America/Sao_Paulo')::date, 'YYYY-MM-DD') AS dia");
  return rows[0].dia;
}

async function publicadoHoje(con = pool) {
  const data = await hoje(con);
  const { rows } = await con.query("SELECT publicado FROM cardapio_dia WHERE data = $1", [data]);
  if (!rows[0] || !rows[0].publicado) return null;
  const tipos = await con.query("SELECT tipo_id FROM cardapio_dia_tipos WHERE data = $1", [data]);
  const produtos = await con.query("SELECT ingrediente_id FROM cardapio_dia_produtos WHERE data = $1", [data]);
  return {
    data,
    tipoIds: new Set(tipos.rows.map((t) => t.tipo_id)),
    produtoIds: new Set(produtos.rows.map((p) => p.ingrediente_id)),
  };
}

module.exports = { hoje, publicadoHoje };
