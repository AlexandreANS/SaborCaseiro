const express = require("express");
const cors = require("cors");
const pool = require("./config/database");
const { lerSessao } = require("./util/seguranca");
const { ErroApi } = require("./util/erros");

const PORTA = process.env.PORT || 3000;
const app = express();
app.set("trust proxy", Number(process.env.TRUST_PROXY) || false);

app.use(cors());
app.use(express.json({ limit: "100kb" }));
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

app.listen(PORTA, () => {
  console.log(`API rodando em http://localhost:${PORTA}`);
});
