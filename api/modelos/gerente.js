const pool = require("../config/database");

async function porEmail(email) {
  const { rows } = await pool.query("SELECT id, nome, email, senha_hash FROM gerentes WHERE email = $1", [email]);
  return rows[0] || null;
}

async function porId(id) {
  const { rows } = await pool.query("SELECT id, nome, email FROM gerentes WHERE id = $1", [id]);
  return rows[0] || null;
}

module.exports = { porEmail, porId };
