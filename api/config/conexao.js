function opcoes(banco) {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    if (banco) url.pathname = "/" + banco;
    return {
      connectionString: url.toString(),
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    };
  }
  return {
    user: process.env.PGUSER || "postgres",
    host: process.env.PGHOST || "localhost",
    database: banco || process.env.PGDATABASE || "sabor_caseiro",
    password: process.env.PGPASSWORD || "postgres",
    port: Number(process.env.PGPORT || 5432),
  };
}

function nomeDoBanco() {
  if (process.env.DATABASE_URL) return decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1));
  return process.env.PGDATABASE || "sabor_caseiro";
}

module.exports = { opcoes, nomeDoBanco };
