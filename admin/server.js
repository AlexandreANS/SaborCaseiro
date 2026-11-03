const express = require("express");
const path = require("path");
const estaticos = require("./estaticos")(path.join(__dirname, "publico"));

const PORTA = process.env.PORT || 5501;
const app = express();

app.disable("x-powered-by");
app.use(estaticos.seguranca());
app.use(estaticos.compressao());

app.get(["/", "/login", "/login.html"], estaticos.pagina("login.html"));
app.get(["/dashboard", "/dashboard.html"], estaticos.pagina("dashboard.html"));
app.get(["/pedidos", "/pedidos.html"], estaticos.pagina("pedidos.html"));
app.get(["/metricas", "/metricas.html"], estaticos.pagina("metricas.html"));
app.get(["/cardapio", "/cardapio.html"], estaticos.pagina("cardapio.html"));
app.get(["/produtos", "/produtos.html"], estaticos.pagina("produtos.html"));
app.get(["/tipos", "/tipos.html"], estaticos.pagina("tipos.html"));
app.get(["/configuracoes", "/configuracoes.html"], estaticos.pagina("configuracoes.html"));

estaticos.servir(app, ["css", "js"]);

app.use((req, res) => res.status(404).send("Página não encontrada."));

const servidor = app.listen(PORTA, () => {
  console.log(`Painel Administrativo rodando em http://localhost:${PORTA}`);
});

for (const sinal of ["SIGINT", "SIGTERM"]) process.on(sinal, () => servidor.close(() => process.exit(0)));
