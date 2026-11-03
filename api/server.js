if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch {}
}

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const pool = require("./config/database");
const { lerSessao } = require("./util/seguranca");
const { ErroApi } = require("./util/erros");
const { preparar } = require("./banco/iniciar");
const { descreverFalhaBanco } = require("./util/diagnostico");
const { validarProducao } = require("./util/producao");
const eventos = require("./servicos/eventos");
const { opcoesCors } = require("./util/origens");

validarProducao();

const PORTA = process.env.PORT || 3000;
const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY) || false);

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors(opcoesCors));
app.use(express.json({ limit: "100kb" }));
app.use((req, res, prox) => {
  if (req.body === undefined) req.body = {};
  prox();
});
if (process.env.SABOR_LOG !== "0" && process.env.NODE_ENV !== "test") {
  app.use((req, res, prox) => {
    const inicio = process.hrtime.bigint();
    res.on("finish", () => {
      if (req.path === "/api/saude") return;
      const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
      console.log(`${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    prox();
  });
}
let avisouProxy = false;
app.use((req, res, prox) => {
  if (!avisouProxy && req.headers["x-forwarded-for"] && !app.get("trust proxy")) {
    avisouProxy = true;
    console.warn(
      "[aviso] Requisição com X-Forwarded-For e TRUST_PROXY desligado: atrás de um proxy defina TRUST_PROXY=1, senão os limites de tentativas valem para todos os visitantes juntos."
    );
  }
  prox();
});
app.use(lerSessao);

app.get("/", (req, res) => res.json({ nome: "API Sabor Caseiro", saude: "/api/saude" }));
app.get("/api/saude", async (req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
});
app.use("/api/acesso", require("./rotas/acesso"));
app.use("/api", require("./rotas/cardapio"));
app.use("/api/pedidos", require("./rotas/pedidos"));
app.use("/api/gestao", require("./rotas/gestao"));

app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada." }));

app.use((erro, req, res, prox) => {
  if (erro.type === "entity.parse.failed") return res.status(400).json({ erro: "JSON inválido." });
  if (erro.type === "entity.too.large") return res.status(413).json({ erro: "Requisição grande demais." });
  if (erro instanceof ErroApi) return res.status(erro.status).json({ erro: erro.message, ...erro.dados });
  console.error(erro);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

let servidor;

function encerrar(motivo, codigo = 0) {
  console.log(`Encerrando (${motivo})...`);
  const forcar = setTimeout(() => process.exit(codigo || 1), 5000);
  forcar.unref();
  eventos.encerrar();
  const fechar = () =>
    pool
      .end()
      .catch(() => {})
      .finally(() => process.exit(codigo));
  if (servidor) servidor.close(fechar);
  else fechar();
}

process.on("SIGINT", () => encerrar("SIGINT"));
process.on("SIGTERM", () => encerrar("SIGTERM"));
process.on("unhandledRejection", (erro) => console.error("Promessa sem tratamento:", erro));
process.on("uncaughtException", (erro) => {
  console.error("Erro não capturado:", erro);
  encerrar("erro não capturado", 1);
});

preparar()
  .then(() => {
    servidor = app.listen(PORTA, () => {
      console.log(`API rodando em http://localhost:${PORTA}`);
    });
  })
  .catch((erro) => {
    console.error("Falha ao preparar o banco:", descreverFalhaBanco(erro));
    process.exit(1);
  });
