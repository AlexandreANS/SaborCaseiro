const express = require("express");
const path = require("path");

const PORTA = process.env.PORT || 5500;
const app = express();
const pasta = path.join(__dirname, "publico");
const pagina = (arquivo) => (req, res) => res.sendFile(path.join(pasta, arquivo));
const tela = (rota) => (req, res) => {
  const consulta = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect("/#" + rota + consulta);
};

app.get(["/", "/index.html"], pagina("index.html"));
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
app.get("/manifest.webmanifest", pagina("manifest.webmanifest"));

app.use("/css", express.static(path.join(pasta, "css")));
app.use("/js", express.static(path.join(pasta, "js")));
app.use("/img", express.static(path.join(pasta, "img")));

app.use((req, res) => res.status(404).send("Página não encontrada."));

app.listen(PORTA, () => {
  console.log(`Cliente rodando em http://localhost:${PORTA}`);
});
