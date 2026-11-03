const express = require("express");
const path = require("path");
const estaticos = require("./estaticos")(path.join(__dirname, "publico"));

const PORTA = process.env.PORT || 5500;
const app = express();
const tela = (rota) => (req, res) => {
  const consulta = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect("/#" + rota + consulta);
};

app.disable("x-powered-by");
app.use(estaticos.seguranca());
app.use(estaticos.compressao());

app.get(["/", "/index.html"], estaticos.pagina("index.html"));
app.get("/login", tela("/login"));
app.get("/cadastro", tela("/cadastro"));
app.get("/esqueci", tela("/esqueci"));
app.get("/redefinir", tela("/redefinir"));
app.get("/home", tela("/home"));
app.get("/montar", tela("/montar"));
app.get("/carrinho", tela("/carrinho"));
app.get("/checkout", tela("/checkout"));
app.get("/pedido", tela("/pedido"));
app.get("/pedidos", tela("/pedidos"));
app.get("/conta", tela("/conta"));
app.get("/manifest.webmanifest", estaticos.arquivo("manifest.webmanifest"));

estaticos.servir(app, ["css", "js", "img"]);

app.use((req, res) => res.status(404).send("Página não encontrada."));

const servidor = app.listen(PORTA, () => {
  console.log(`Cliente rodando em http://localhost:${PORTA}`);
});

for (const sinal of ["SIGINT", "SIGTERM"]) process.on(sinal, () => servidor.close(() => process.exit(0)));
