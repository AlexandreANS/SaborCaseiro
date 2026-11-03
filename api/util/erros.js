class ErroApi extends Error {
  constructor(mensagem, status = 400, dados = null) {
    super(mensagem);
    this.status = status;
    this.dados = dados;
  }
}

const repetido = (mensagem) => (erro) => {
  if (erro.code === "23505") throw new ErroApi(mensagem, 409);
  throw erro;
};

module.exports = { ErroApi, repetido };
