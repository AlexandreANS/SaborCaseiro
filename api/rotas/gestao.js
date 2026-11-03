const express = require("express");
const { exigirGerente } = require("../util/seguranca");
const { limitarLogin } = require("../util/limite");
const { assinar } = require("../servicos/eventos");
const acesso = require("../controladores/gestao/acesso");
const pedidos = require("../controladores/gestao/pedidos");
const metricas = require("../controladores/gestao/metricas");
const loja = require("../controladores/gestao/loja");
const produtos = require("../controladores/gestao/produtos");
const tipos = require("../controladores/gestao/tipos");
const cardapioDia = require("../controladores/gestao/cardapioDia");
const bairros = require("../controladores/gestao/bairros");
const cupons = require("../controladores/gestao/cupons");
const recusas = require("../controladores/gestao/recusas");

const rotas = express.Router();

function crud(controle, chave = ":id") {
  const r = express.Router();
  r.get("/", controle.listar);
  r.post("/", controle.criar);
  r.put("/" + chave, controle.atualizar);
  r.delete("/" + chave, controle.remover);
  return r;
}

rotas.post("/login", limitarLogin(), acesso.login);
rotas.use(exigirGerente);
rotas.get("/eu", acesso.perfil);
rotas.get("/eventos", (req, res) => assinar("gerente", req, res));

const ped = express.Router();
ped.get("/contagem", pedidos.contagem);
ped.get("/", pedidos.listar);
ped.get("/:id", pedidos.ver);
ped.post("/:id/aceitar", pedidos.aceitar);
ped.post("/:id/recusar", pedidos.recusar);
ped.put("/:id/status", pedidos.mudarStatus);
ped.get("/:id/mensagens", pedidos.mensagens);
ped.post("/:id/mensagens", pedidos.enviarMensagem);
rotas.use("/pedidos", ped);

rotas.get("/metricas", metricas.ver);
rotas.get("/loja", loja.ver);
rotas.put("/loja", loja.salvar);
rotas.use("/produtos", crud(produtos));
rotas.use("/tipos", crud(tipos));
rotas.use("/bairros", crud(bairros));
rotas.use("/cupons", crud(cupons, ":codigo"));
rotas.use("/recusas", crud(recusas));

const dia = express.Router();
dia.get("/hoje", cardapioDia.hoje);
dia.get("/:data", cardapioDia.ver);
dia.put("/:data", cardapioDia.gravar);
dia.post("/:data/copiar", cardapioDia.copiar);
dia.post("/:data/publicar", cardapioDia.publicar);
rotas.use("/cardapio-dia", dia);

module.exports = rotas;
