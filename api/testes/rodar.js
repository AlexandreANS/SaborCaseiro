const { spawn } = require("child_process");
const path = require("path");
const { Client } = require("pg");
const { opcoes } = require("../config/conexao");

const BANCO = process.env.PGDATABASE_TESTE || "sabor_caseiro_teste";
const PORTA = process.env.PORTA_TESTE || "3100";
const pasta = path.join(__dirname, "..");
const aspas = (nome) => `"${nome.replace(/"/g, '""')}"`;

async function admin(sql) {
  const cliente = new Client(opcoes("postgres"));
  await cliente.connect();
  try {
    await cliente.query(sql);
  } finally {
    await cliente.end();
  }
}

async function esperarApi() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${PORTA}/api/saude`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("A API de teste não subiu em 30 segundos.");
}

(async () => {
  await admin(`DROP DATABASE IF EXISTS ${aspas(BANCO)} WITH (FORCE)`);
  await admin(`CREATE DATABASE ${aspas(BANCO)}`);

  const ambiente = {
    ...process.env,
    PORT: PORTA,
    PGDATABASE: BANCO,
    SABOR_HORARIO: "sempre",
    SABOR_DEV_LINK: "1",
    SABOR_CEP_URL: "http://localhost:5599/ws",
    CEP_MAX: "100000",
    CADASTRO_MAX: "1000",
    PEDIDO_MAX: "1000",
  };
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = "/" + BANCO;
    ambiente.DATABASE_URL = url.toString();
  }

  const api = spawn(process.execPath, ["server.js"], { cwd: pasta, env: ambiente, stdio: ["ignore", "pipe", "inherit"] });
  api.stdout.resume();
  let saida = 1;
  try {
    await esperarApi();
    const testes = spawn(process.execPath, ["--test", path.join(__dirname, "api.test.js")], {
      cwd: pasta,
      env: { ...ambiente, API_URL: `http://localhost:${PORTA}` },
      stdio: "inherit",
    });
    saida = await new Promise((ok) => testes.on("exit", (codigo) => ok(codigo ?? 1)));
  } finally {
    api.kill("SIGTERM");
    await new Promise((ok) => setTimeout(ok, 500));
    await admin(`DROP DATABASE IF EXISTS ${aspas(BANCO)} WITH (FORCE)`).catch(() => {});
  }
  process.exit(saida);
})().catch((erro) => {
  console.error("Não foi possível rodar os testes:", erro.message);
  process.exit(1);
});
