const { ErroApi } = require("./erros");

function confirmarExclusao(req, aviso) {
  if (!aviso || req.query.forcar === "1") return;
  throw new ErroApi(aviso, 409, { confirmar: true });
}

module.exports = confirmarExclusao;
