const { Pool } = require("pg");
const { opcoes } = require("./conexao");

const pool = new Pool(opcoes());

pool.on("error", (erro) => console.error("Conexão ociosa do banco falhou:", erro.message));

module.exports = pool;
