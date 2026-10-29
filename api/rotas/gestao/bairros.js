const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");
const { avisoBairro, confirmarExclusao } = require("../../util/uso");
const { texto, numero, idDaRota } = require("../../util/validar");

const rota = express.Router();
const CAMPOS = "id, nome, taxa_entrega::float, ativo";

function ler(corpo) {
  return { nome: texto(corpo.nome, "Nome", 2, 80), taxa: numero(corpo.taxa_entrega, "Taxa"), ativo: corpo.ativo !== false };
}

function repetido(erro) {
  if (erro.code === "23505") throw new ErroApi("Já existe um bairro com esse nome.", 409);
  throw erro;
}

rota.get("/", async (req, res) => {
  const { rows } = await pool.query(`SELECT ${CAMPOS} FROM bairros ORDER BY nome`);
  res.json(rows);
});

rota.post("/", async (req, res) => {
  const d = ler(req.body);
  const { rows } = await pool.query(`INSERT INTO bairros (nome, taxa_entrega, ativo) VALUES ($1,$2,$3) RETURNING ${CAMPOS}`, [d.nome, d.taxa, d.ativo]).catch(repetido);
  res.status(201).json(rows[0]);
});

rota.put("/:id", async (req, res) => {
  const d = ler(req.body);
  const { rows } = await pool.query(`UPDATE bairros SET nome=$2, taxa_entrega=$3, ativo=$4 WHERE id=$1 RETURNING ${CAMPOS}`, [idDaRota(req.params.id), d.nome, d.taxa, d.ativo]).catch(repetido);
  if (!rows[0]) throw new ErroApi("Bairro não encontrado.", 404);
  res.json(rows[0]);
});

rota.delete("/:id", async (req, res) => {
  const id = idDaRota(req.params.id);
  await confirmarExclusao(req, await avisoBairro(id));
  const { rowCount } = await pool.query("DELETE FROM bairros WHERE id = $1", [id]);
  if (!rowCount) throw new ErroApi("Bairro não encontrado.", 404);
  res.status(204).end();
});

module.exports = rota;
