const emProducao = () => process.env.NODE_ENV === "production";

function problemasDeProducao() {
  if (!emProducao()) return [];
  const falhas = [];
  const segredo = process.env.SABOR_SECRET || "";
  if (segredo.length < 24) falhas.push("SABOR_SECRET precisa existir e ter pelo menos 24 caracteres (assina os logins).");
  if (process.env.SABOR_DEV_LINK === "1") falhas.push("SABOR_DEV_LINK=1 expõe o link de redefinição de senha; desligue em produção.");
  return falhas;
}

function exigirSenhaGerente(senha) {
  if (!emProducao()) return;
  if (!senha || senha === "gerente123" || senha.length < 8) {
    throw new Error("Defina GERENTE_SENHA (mínimo de 8 caracteres e diferente do padrão) para criar o gerente em produção.");
  }
}

function validarProducao() {
  const falhas = problemasDeProducao();
  if (!falhas.length) return;
  console.error("Configuração insegura para produção:");
  falhas.forEach((f) => console.error(" - " + f));
  process.exit(1);
}

module.exports = { emProducao, validarProducao, exigirSenhaGerente };
