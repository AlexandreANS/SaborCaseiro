const fs = require("fs");
const path = require("path");

const raiz = __dirname;
const destinos = [
  ["dom.js", "../cliente/publico/js/dom.js"],
  ["dom.js", "../admin/publico/js/dom.js"],
  ["estaticos.js", "../cliente/estaticos.js"],
  ["estaticos.js", "../admin/estaticos.js"],
];

function sincronizar() {
  const copiados = [];
  for (const [origem, destino] of destinos) {
    const de = path.join(raiz, origem);
    const para = path.join(raiz, destino);
    if (!fs.existsSync(de) || !fs.existsSync(path.dirname(para))) continue;
    const novo = fs.readFileSync(de);
    if (fs.existsSync(para) && fs.readFileSync(para).equals(novo)) continue;
    fs.writeFileSync(para, novo);
    copiados.push(path.relative(path.join(raiz, ".."), para));
  }
  return copiados;
}

if (require.main === module) {
  const copiados = sincronizar();
  if (copiados.length) console.log("Sincronizado:", copiados.join(", "));
}

module.exports = { sincronizar };
