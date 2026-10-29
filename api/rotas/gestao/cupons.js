const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");
const { texto, numero, dia } = require("../../util/validar");

const rota = express.Router();
const CAMPOS = "codigo, percentual::float, apenas_primeiro_pedido, valor_minimo::float, to_char(valido_ate, 'YYYY-MM-DD') AS valido_ate, ativo";

function ler(corpo) {
  const percentual = numero(corpo.percentual, "Percentual");
  if (percentual <= 0 || percentual > 100) throw new ErroApi("Percentual inválido.");
  return {
    percentual,
    primeiro: corpo.apenas_primeiro_pedido === true,
    minimo: numero(corpo.valor_minimo ?? 0, "Valor mínimo"),
    ate: corpo.valido_ate ? dia(corpo.valido_ate, "Validade") : null,
    ativo: corpo.ativo !== false,
  };
}

function codigo(valor) {
  const c = texto(valor, "Código", 3, 30).toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(c)) throw new ErroApi("Código inválido: use letras, números, - ou _.");
  return c;
}

rota.get("/", async (req, res) => {
  const { rows } = await pool.query(`SELECT ${CAMPOS} FROM cupons ORDER BY codigo`);
  res.json(rows);
});

rota.post("/", async (req, res) => {
  const d = ler(req.body);
  const { rows } = await pool
    .query(`INSERT INTO cupons (codigo, percentual, apenas_primeiro_pedido, valor_minimo, valido_ate, ativo) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${CAMPOS}`, [codigo(req.body.codigo), d.percentual, d.primeiro, d.minimo, d.ate, d.ativo])
    .catch((erro) => {
      if (erro.code === "23505") throw new ErroApi("Já existe um cupom com esse código.", 409);
      throw erro;
    });
  res.status(201).json(rows[0]);
});

rota.put("/:codigo", async (req, res) => {
  const d = ler(req.body);
  const { rows } = await pool.query(
    `UPDATE cupons SET percentual=$2, apenas_primeiro_pedido=$3, valor_minimo=$4, valido_ate=$5, ativo=$6 WHERE codigo=$1 RETURNING ${CAMPOS}`,
    [codigo(req.params.codigo), d.percentual, d.primeiro, d.minimo, d.ate, d.ativo]
  );
  if (!rows[0]) throw new ErroApi("Cupom não encontrado.", 404);
  res.json(rows[0]);
});

rota.delete("/:codigo", async (req, res) => {
  const { rowCount } = await pool.query("DELETE FROM cupons WHERE codigo = $1", [codigo(req.params.codigo)]);
  if (!rowCount) throw new ErroApi("Cupom não encontrado.", 404);
  res.status(204).end();
});

module.exports = rota;
