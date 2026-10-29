const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");
const { texto, idDaRota } = require("../../util/validar");

const rota = express.Router();

function repetido(erro) {
  if (erro.code === "23505") throw new ErroApi("Essa mensagem já existe.", 409);
  throw erro;
}

rota.get("/", async (req, res) => {
  const { rows } = await pool.query("SELECT id, texto FROM mensagens_recusa ORDER BY id");
  res.json(rows);
});

rota.post("/", async (req, res) => {
  const { rows } = await pool.query("INSERT INTO mensagens_recusa (texto) VALUES ($1) RETURNING id, texto", [texto(req.body.texto, "Mensagem", 3, 300)]).catch(repetido);
  res.status(201).json(rows[0]);
});

rota.put("/:id", async (req, res) => {
  const { rows } = await pool.query("UPDATE mensagens_recusa SET texto = $2 WHERE id = $1 RETURNING id, texto", [idDaRota(req.params.id), texto(req.body.texto, "Mensagem", 3, 300)]).catch(repetido);
  if (!rows[0]) throw new ErroApi("Mensagem não encontrada.", 404);
  res.json(rows[0]);
});

rota.delete("/:id", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM mensagens_recusa WHERE id = $1", [idDaRota(req.params.id)]);
  if (!rowCount) throw new ErroApi("Mensagem não encontrada.", 404);
  res.status(204).end();
});

module.exports = rota;
