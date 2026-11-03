const js = require("@eslint/js");
const globals = require("globals");

const nomes = ["Dom", "Sabor", "Adm"];
const doProjeto = Object.fromEntries(nomes.map((n) => [n, "writable"]));

module.exports = [
  { ignores: ["**/node_modules/**", "cliente/publico/js/dom.js", "admin/publico/js/dom.js", "cliente/estaticos.js", "admin/estaticos.js"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "commonjs", globals: globals.node },
    rules: { "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }], "no-empty": ["error", { allowEmptyCatch: true }] },
  },
  {
    files: ["cliente/publico/js/**/*.js", "admin/publico/js/**/*.js", "comum/dom.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, ...doProjeto } },
  },
];
