const express = require("express");
const path = require("path");

const PORTA = process.env.PORT || 5501;
const app = express();
const pasta = path.join(__dirname, "publico");
const pagina = (arquivo) => (req, res) => res.sendFile(path.join(pasta, arquivo));

app.get(["/", "/login", "/login.html"], pagina("login.html"));
app.get(["/dashboard", "/dashboard.html"], pagina("dashboard.html"));
app.get(["/pedidos", "/pedidos.html"], pagina("pedidos.html"));
app.get(["/metricas", "/metricas.html"], pagina("metricas.html"));
app.get(["/cardapio", "/cardapio.html"], pagina("cardapio.html"));
app.get(["/produtos", "/produtos.html"], pagina("produtos.html"));
app.get(["/tipos", "/tipos.html"], pagina("tipos.html"));
app.get(["/configuracoes", "/configuracoes.html"], pagina("configuracoes.html"));

app.use("/css", express.static(path.join(pasta, "css")));
app.use("/js", express.static(path.join(pasta, "js")));

app.use((req, res) => res.status(404).send("Página não encontrada."));

app.listen(PORTA, () => {
  console.log(`Painel Administrativo rodando em http://localhost:${PORTA}`);
});
