const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");
const { avisoProduto, confirmarExclusao } = require("../../util/uso");
const { texto, numero, idDaRota, CATEGORIAS } = require("../../util/validar");

const rota = express.Router();
const CAMPOS = "id, nome, categoria, preco_extra::float, ativo";

function ler(corpo) {
  const categoria = String(corpo.categoria || "");
  if (!CATEGORIAS.includes(categoria)) throw new ErroApi("Categoria inválida.");
  return {
    nome: texto(corpo.nome, "Nome", 2, 80),
    categoria,
    preco_extra: numero(corpo.preco_extra ?? 0, "Preço"),
    ativo: corpo.ativo !== false,
  };
}

function repetido(erro) {
  if (erro.code === "23505") throw new ErroApi("Já existe um produto com esse nome nessa categoria.", 409);
  throw erro;
}

rota.get("/", async (req, res) => {
  const { rows } = await pool.query(`SELECT ${CAMPOS} FROM ingredientes ORDER BY categoria, nome`);
  res.json(rows);
});

rota.post("/", async (req, res) => {
  const d = ler(req.body);
  const { rows } = await pool
    .query(`INSERT INTO ingredientes (nome, categoria, preco_extra, ativo) VALUES ($1,$2,$3,$4) RETURNING ${CAMPOS}`, [d.nome, d.categoria, d.preco_extra, d.ativo])
    .catch(repetido);
  res.status(201).json(rows[0]);
});

rota.put("/:id", async (req, res) => {
  const d = ler(req.body);
  const { rows } = await pool
    .query(`UPDATE ingredientes SET nome=$2, categoria=$3, preco_extra=$4, ativo=$5 WHERE id=$1 RETURNING ${CAMPOS}`, [idDaRota(req.params.id), d.nome, d.categoria, d.preco_extra, d.ativo])
    .catch(repetido);
  if (!rows[0]) throw new ErroApi("Produto não encontrado.", 404);
  res.json(rows[0]);
});

rota.delete("/:id", async (req, res) => {
  const id = idDaRota(req.params.id);
  await confirmarExclusao(req, await avisoProduto(id));
  const { rowCount } = await pool.query("DELETE FROM ingredientes WHERE id = $1", [id]);
  if (!rowCount) throw new ErroApi("Produto não encontrado.", 404);
  res.status(204).end();
});

module.exports = rota;
