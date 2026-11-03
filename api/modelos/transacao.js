const pool = require("../config/database");

async function transacao(fn) {
  const con = await pool.connect();
  let falhou = null;
  try {
    await con.query("BEGIN");
    const resultado = await fn(con);
    await con.query("COMMIT");
    return resultado;
  } catch (erro) {
    try {
      await con.query("ROLLBACK");
    } catch (erroRollback) {
      falhou = erroRollback;
    }
    throw erro;
  } finally {
    con.release(falhou || undefined);
  }
}

module.exports = transacao;
