const { Pool } = require("pg");

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost",
      database: process.env.PGDATABASE || "sabor_caseiro",
      password: process.env.PGPASSWORD || "postgres",
      port: Number(process.env.PGPORT || 5432),
    });

module.exports = pool;
