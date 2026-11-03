const express = require("express");
const { exigirLogin } = require("../util/seguranca");
const { limitarPedido, limitarMensagem } = require("../util/limite");
const c = require("../controladores/pedidos");

const rotas = express.Router();
rotas.use(exigirLogin);

rotas.post("/", limitarPedido(), c.criar);
rotas.get("/eventos", c.eventos);
rotas.get("/", c.listar);
rotas.get("/:id", c.ver);
rotas.post("/:id/cancelar", c.cancelar);
rotas.get("/:id/repetir", c.repetir);
rotas.get("/:id/mensagens", c.mensagens);
rotas.post("/:id/mensagens", limitarMensagem(), c.enviarMensagem);

module.exports = rotas;
