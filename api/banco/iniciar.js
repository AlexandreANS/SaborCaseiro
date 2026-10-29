const fs = require("fs");
const path = require("path");
const pool = require("../config/database");
const { gerarHash } = require("../util/seguranca");

const ler = (arquivo) => fs.readFileSync(path.join(__dirname, arquivo), "utf8");

(async () => {
  try {
    if (process.argv.includes("--reset")) {
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
    const novo = await pool.query(
      "INSERT INTO gerentes (nome, email, senha_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id",
      ["Gerente", email, await gerarHash(senha)]
    );
    console.log(novo.rowCount ? `OK: gerente ${email} criado` : `OK: gerente ${email} já existe, mantido`);
  } catch (erro) {
    console.error("Falha ao inicializar o banco:", erro.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
