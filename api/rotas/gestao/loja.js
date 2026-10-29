const express = require("express");
const { lerLoja, salvarLoja } = require("../../util/loja");

const rota = express.Router();

rota.get("/", async (req, res) => {
  res.json(await lerLoja());
});

rota.put("/", async (req, res) => {
  res.json(await salvarLoja(req.body));
});

module.exports = rota;
