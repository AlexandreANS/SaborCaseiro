const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const pool = require("../config/database");
const { opcoes, nomeDoBanco } = require("../config/conexao");
const { gerarHash } = require("../util/seguranca");
const { descreverFalhaBanco } = require("../util/diagnostico");
const { exigirSenhaGerente } = require("../util/producao");

const ler = (arquivo) => fs.readFileSync(path.join(__dirname, arquivo), "utf8");

async function criarBancoSeFaltar() {
  try {
    await pool.query("SELECT 1");
    return;
  } catch (erro) {
    if (erro.code !== "3D000") throw erro;
  }
  const nome = nomeDoBanco();
  const admin = new Client(opcoes("postgres"));
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${nome.replace(/"/g, '""')}"`);
    console.log(`OK: banco "${nome}" criado`);
  } finally {
    await admin.end();
  }
}

async function preparar({ reset = false } = {}) {
  await criarBancoSeFaltar();
  if (reset) {
    await pool.query(ler("reiniciar.sql"));
    console.log("OK: tabelas apagadas");
  }

  await pool.query(ler("esquema.sql"));
  console.log("OK: tabelas");

  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM tipos_marmita) + (SELECT count(*) FROM ingredientes)
          + (SELECT count(*) FROM bairros) + (SELECT count(*) FROM cupons) AS n`
  );
  if (Number(rows[0].n) === 0) {
    await pool.query(ler("dados.sql"));
    console.log("OK: dados iniciais");
  } else {
    console.log("OK: dados iniciais já existem, mantidos");
  }

  const email = (process.env.GERENTE_EMAIL || "gerente@saborcaseiro.com.br").toLowerCase();
  const senha = process.env.GERENTE_SENHA || "gerente123";
  const existe = await pool.query("SELECT 1 FROM gerentes WHERE email = $1", [email]);
  if (!existe.rowCount) exigirSenhaGerente(process.env.GERENTE_SENHA);
  const novo = await pool.query(
    "INSERT INTO gerentes (nome, email, senha_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
    ["Gerente", email, await gerarHash(senha)]
  );
  console.log(novo.rowCount ? `OK: gerente ${email} criado` : `OK: gerente ${email} já existe, mantido`);
}

module.exports = { preparar };

if (require.main === module) {
  preparar({ reset: process.argv.includes("--reset") })
    .catch((erro) => {
      console.error("Falha ao inicializar o banco:", descreverFalhaBanco(erro));
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
