const express = require("express");
const { lerSessao } = require("../util/seguranca");
const { limitarCep } = require("../util/limite");
const c = require("../controladores/cardapio");

const rotas = express.Router();

rotas.get("/cardapio", c.cardapio);
rotas.get("/funcionamento", c.funcionamento);
rotas.get("/loja", c.loja);
rotas.get("/bairros", c.bairros);
rotas.get("/cep/:cep", limitarCep(), c.cep);
rotas.post("/carrinho/cotacao", lerSessao, c.cotacao);

module.exports = rotas;
