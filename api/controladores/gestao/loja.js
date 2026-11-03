const Loja = require("../../modelos/loja");

async function ver(req, res) {
  res.json(await Loja.lerLoja());
}

async function salvar(req, res) {
  res.json(await Loja.salvarLoja(req.body));
}

module.exports = { ver, salvar };
