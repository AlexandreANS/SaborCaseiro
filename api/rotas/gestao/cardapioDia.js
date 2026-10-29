const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");
const { dia, inteiro } = require("../../util/validar");
const { hoje } = require("../../util/cardapio");

const rota = express.Router();

async function montar(data) {
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

function ids(lista, nome) {
  if (!Array.isArray(lista)) throw new ErroApi(`${nome} inválidos.`);
  return [...new Set(lista.map((i) => inteiro(i, nome, 1)))];
}

rota.get("/hoje", async (req, res) => res.json(await montar(await hoje())));

rota.get("/:data", async (req, res) => res.json(await montar(dia(req.params.data))));

rota.put("/:data", async (req, res) => {
  const data = dia(req.params.data);
  const tipos = ids(req.body.tipo_ids, "Tipos");
  const produtos = ids(req.body.produto_ids, "Produtos");
  const con = await pool.connect();
  try {
    await con.query("BEGIN");
    await con.query("INSERT INTO cardapio_dia (data) VALUES ($1) ON CONFLICT DO NOTHING", [data]);
    await con.query("DELETE FROM cardapio_dia_tipos WHERE data = $1", [data]);
    await con.query("DELETE FROM cardapio_dia_produtos WHERE data = $1", [data]);
    for (const t of tipos) await con.query("INSERT INTO cardapio_dia_tipos (data, tipo_id) VALUES ($1,$2)", [data, t]);
    for (const p of produtos) await con.query("INSERT INTO cardapio_dia_produtos (data, ingrediente_id) VALUES ($1,$2)", [data, p]);
    await con.query("COMMIT");
  } catch (erro) {
    await con.query("ROLLBACK");
    if (erro.code === "23503") throw new ErroApi("Há itens inexistentes na seleção.");
    throw erro;
  } finally {
    con.release();
  }
  res.json(await montar(data));
});

rota.post("/:data/publicar", async (req, res) => {
  const data = dia(req.params.data);
  const publicar = req.body.publicado !== false;
  const atual = await montar(data);
  if (publicar && (!atual.tipo_ids.length || !atual.produto_ids.length)) {
    throw new ErroApi("Selecione ao menos um tipo e um produto antes de publicar.");
  }
  await pool.query(
    "INSERT INTO cardapio_dia (data, publicado) VALUES ($1,$2) ON CONFLICT (data) DO UPDATE SET publicado = EXCLUDED.publicado",
    [data, publicar]
  );
  res.json(await montar(data));
});

module.exports = rota;
