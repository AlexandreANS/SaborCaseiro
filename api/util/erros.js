class ErroApi extends Error {
  constructor(mensagem, status = 400, dados = null) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

module.exports = { ErroApi };
