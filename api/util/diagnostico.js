const { opcoes, nomeDoBanco } = require("../config/conexao");

function descreverFalhaBanco(erro) {
  const o = opcoes();
  const onde = o.connectionString ? "o banco de DATABASE_URL" : `${o.host}:${o.port}`;
  if (["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH"].includes(erro.code) || (erro.errors && erro.errors.length)) {
    return `Não consegui conectar ao Postgres em ${onde}. Ele está rodando? Confira PGHOST e PGPORT (ou DATABASE_URL).`;
  }
  if (erro.code === "28P01" || erro.code === "28000") {
    return "O Postgres recusou o usuário ou a senha. Confira PGUSER e PGPASSWORD (ou DATABASE_URL).";
  }
  if (erro.code === "3D000") {
    return `O banco "${nomeDoBanco()}" não existe e não consegui criá-lo. Crie com: createdb ${nomeDoBanco()}`;
  }
  if (erro.code === "42501") {
    return "O usuário do Postgres não tem permissão para criar tabelas neste banco.";
  }
  return erro.message || String(erro);
}

module.exports = { descreverFalhaBanco };
