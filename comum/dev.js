const { spawn } = require("child_process");
const path = require("path");
const { sincronizar } = require("./sincronizar");

const raiz = path.join(__dirname, "..");
const observar = !process.argv.includes("--producao");
const servicos = [
  { nome: "api", pasta: "api", cor: 36 },
  { nome: "cliente", pasta: "cliente", cor: 32 },
  { nome: "admin", pasta: "admin", cor: 35 },
];

sincronizar();

const filhos = servicos.map((s) => {
  const args = [...(observar ? ["--watch"] : []), "server.js"];
  const filho = spawn(process.execPath, args, { cwd: path.join(raiz, s.pasta), env: process.env });
  const prefixo = `\x1b[${s.cor}m[${s.nome}]\x1b[0m `;
  const escrever = (saida) => (dados) =>
    String(dados)
      .split("\n")
      .filter(Boolean)
      .forEach((linha) => saida.write(prefixo + linha + "\n"));
  filho.stdout.on("data", escrever(process.stdout));
  filho.stderr.on("data", escrever(process.stderr));
  filho.on("exit", (codigo) => {
    if (!encerrando) {
      console.error(`${prefixo}encerrou (código ${codigo}). Parando os outros.`);
      encerrar(codigo || 1);
    }
  });
  return filho;
});

let encerrando = false;
function encerrar(codigo = 0) {
  if (encerrando) return;
  encerrando = true;
  filhos.forEach((f) => f.kill("SIGTERM"));
  setTimeout(() => process.exit(codigo), 1500).unref();
}

process.on("SIGINT", () => encerrar(0));
process.on("SIGTERM", () => encerrar(0));

console.log("API http://localhost:3000 | Cliente http://localhost:5500 | Gerente http://localhost:5501  (Ctrl+C para parar)");
