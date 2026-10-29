const express = require("express");
const { exigirGerente } = require("../../util/seguranca");
const { assinar } = require("../../util/eventos");

const rota = express.Router();

rota.use(require("./acesso"));
rota.use(exigirGerente);
rota.get("/eventos", (req, res) => assinar("gerente", req, res));
rota.use("/pedidos", require("./pedidos"));
rota.use("/metricas", require("./metricas"));
rota.use("/loja", require("./loja"));
rota.use("/produtos", require("./produtos"));
rota.use("/tipos", require("./tipos"));
rota.use("/cardapio-dia", require("./cardapioDia"));
rota.use("/bairros", require("./bairros"));
rota.use("/cupons", require("./cupons"));
rota.use("/recusas", require("./recusas"));

module.exports = rota;
