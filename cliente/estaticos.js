const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");

const ANO = 60 * 60 * 24 * 365;

function destinoApi(req) {
  const host = req.hostname;
  const extra = process.env.SABOR_API_URL ? " " + process.env.SABOR_API_URL.replace(/\/+$/, "") : "";
  return `http://${host}:3000 https://${host}:3000${extra}`;
}

function criar(pasta) {
  let ultima = { em: 0, valor: "0" };

  function versao() {
    if (Date.now() - ultima.em < 1000) return ultima.valor;
    let maior = 0;
    const varrer = (dir) => {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        const caminho = path.join(dir, item.name);
        if (item.isDirectory()) varrer(caminho);
        else maior = Math.max(maior, fs.statSync(caminho).mtimeMs);
      }
    };
    for (const sub of ["js", "css"]) varrer(path.join(pasta, sub));
    ultima = { em: Date.now(), valor: Math.floor(maior).toString(36) };
    return ultima.valor;
  }

  function seguranca() {
    return helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "https://fonts.googleapis.com"],
          fontSrc: ["https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'", destinoApi],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    });
  }

  function pagina(arquivo) {
    return (req, res) => {
      const v = versao();
      const html = fs.readFileSync(path.join(pasta, arquivo), "utf8").replace(/(src|href)="((?:js|css)\/[^"?]+)"/g, `$1="$2?v=${v}"`);
      res.set("Cache-Control", "no-cache").type("html").send(html);
    };
  }

  function arquivo(nome) {
    return (req, res) => res.set("Cache-Control", "no-cache").sendFile(path.join(pasta, nome));
  }

  function servir(app, pastas) {
    for (const nome of pastas) {
      const versionada = ["js", "css"].includes(nome);
      app.use(
        "/" + nome,
        (req, res, prox) => {
          res.set("Cache-Control", versionada ? (req.query.v ? `public, max-age=${ANO}, immutable` : "no-cache") : "public, max-age=86400");
          prox();
        },
        express.static(path.join(pasta, nome), { cacheControl: false })
      );
    }
  }

  return { seguranca, compressao: compression, pagina, arquivo, servir };
}

module.exports = criar;
