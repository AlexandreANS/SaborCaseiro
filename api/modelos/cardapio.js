const pool = require("../config/database");
const transacao = require("./transacao");
const { ErroApi } = require("../util/erros");

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

async function proximoPublicado() {
  const dia = await hoje();
  const { rows } = await pool.query(
    "SELECT to_char(data, 'YYYY-MM-DD') AS data FROM cardapio_dia WHERE publicado AND data > $1 ORDER BY data LIMIT 1",
    [dia]
  );
  return rows[0] ? rows[0].data : null;
}

async function tiposDoMenu(ids) {
  const { rows } = await pool.query(
    "SELECT id, nome, descricao, preco::float FROM tipos_marmita WHERE ativo AND id = ANY($1) ORDER BY ordem, id",
    [ids]
  );
  return rows;
}

async function categorias() {
  const { rows } = await pool.query(
    "SELECT tipo_id, categoria, ordem, minimo, maximo FROM tipo_categorias WHERE categoria <> 'extra' ORDER BY tipo_id, ordem"
  );
  return rows;
}

async function vinculos(produtoIds) {
  const { rows } = await pool.query(
    `SELECT ti.tipo_id, i.id, i.nome, i.categoria, i.preco_extra::float
       FROM tipo_ingredientes ti JOIN ingredientes i ON i.id = ti.ingrediente_id
      WHERE i.ativo AND i.categoria <> 'extra' AND i.id = ANY($1) ORDER BY i.id`,
    [produtoIds]
  );
  return rows;
}

async function extrasDoMenu(produtoIds) {
  const { rows } = await pool.query(
    "SELECT id, nome, categoria, preco_extra::float FROM ingredientes WHERE ativo AND categoria = 'extra' AND id = ANY($1) ORDER BY id",
    [produtoIds]
  );
  return rows;
}

async function dia(data) {
  const cab = await pool.query("SELECT publicado FROM cardapio_dia WHERE data = $1", [data]);
  const tipos = await pool.query("SELECT tipo_id FROM cardapio_dia_tipos WHERE data = $1 ORDER BY tipo_id", [data]);
  const produtos = await pool.query("SELECT ingrediente_id FROM cardapio_dia_produtos WHERE data = $1 ORDER BY ingrediente_id", [data]);
  return {
    data,
    publicado: cab.rows[0] ? cab.rows[0].publicado : false,
    tipo_ids: tipos.rows.map((t) => t.tipo_id),
    produto_ids: produtos.rows.map((p) => p.ingrediente_id),
  };
}

async function gravarDia(data, tipos, produtos) {
  await transacao(async (con) => {
    await con.query("INSERT INTO cardapio_dia (data) VALUES ($1) ON CONFLICT DO NOTHING", [data]);
    await con.query("DELETE FROM cardapio_dia_tipos WHERE data = $1", [data]);
    await con.query("DELETE FROM cardapio_dia_produtos WHERE data = $1", [data]);
    for (const t of tipos) await con.query("INSERT INTO cardapio_dia_tipos (data, tipo_id) VALUES ($1,$2)", [data, t]);
    for (const p of produtos) await con.query("INSERT INTO cardapio_dia_produtos (data, ingrediente_id) VALUES ($1,$2)", [data, p]);
  }).catch((erro) => {
    if (erro.code === "23503") throw new ErroApi("Há itens inexistentes na seleção.");
    throw erro;
  });
}

async function copiarUltimo(data) {
  return transacao(async (con) => {
    const { rows } = await con.query(
      `SELECT t.data::text AS data FROM cardapio_dia_tipos t JOIN cardapio_dia_produtos p ON p.data = t.data
        WHERE t.data < $1 GROUP BY t.data ORDER BY t.data DESC LIMIT 1`,
      [data]
    );
    if (!rows[0]) return null;
    await con.query("INSERT INTO cardapio_dia (data) VALUES ($1) ON CONFLICT DO NOTHING", [data]);
    await con.query("DELETE FROM cardapio_dia_tipos WHERE data = $1", [data]);
    await con.query("DELETE FROM cardapio_dia_produtos WHERE data = $1", [data]);
    await con.query(
      `INSERT INTO cardapio_dia_tipos (data, tipo_id)
       SELECT $1, c.tipo_id FROM cardapio_dia_tipos c JOIN tipos_marmita t ON t.id = c.tipo_id WHERE c.data = $2 AND t.ativo`,
      [data, rows[0].data]
    );
    await con.query(
      `INSERT INTO cardapio_dia_produtos (data, ingrediente_id)
       SELECT $1, c.ingrediente_id FROM cardapio_dia_produtos c JOIN ingredientes i ON i.id = c.ingrediente_id WHERE c.data = $2 AND i.ativo`,
      [data, rows[0].data]
    );
    return rows[0].data;
  });
}

async function publicar(data, valor) {
  await pool.query(
    "INSERT INTO cardapio_dia (data, publicado) VALUES ($1,$2) ON CONFLICT (data) DO UPDATE SET publicado = EXCLUDED.publicado",
    [data, valor]
  );
}

module.exports = {
  copiarUltimo,
  hoje,
  publicadoHoje,
  proximoPublicado,
  tiposDoMenu,
  categorias,
  vinculos,
  extrasDoMenu,
  dia,
  gravarDia,
  publicar,
};
