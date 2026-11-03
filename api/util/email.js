const producao = process.env.NODE_ENV === "production";
let transporte;

function obterTransporte() {
  if (transporte === undefined) {
    transporte = process.env.SMTP_URL ? require("nodemailer").createTransport(process.env.SMTP_URL) : null;
  }
  return transporte;
}

async function enviar(para, assunto, texto) {
  const t = obterTransporte();
  if (t) {
    try {
      await t.sendMail({
        from: process.env.SMTP_DE || "Sabor Caseiro <nao-responda@saborcaseiro.local>",
        to: para,
        subject: assunto,
        text: texto,
      });
    } catch (erro) {
      console.error(`[e-mail] falha ao enviar para ${para}: ${erro.message}`);
    }
    return;
  }
  if (producao) {
    console.warn(`[e-mail] SMTP_URL não configurado: e-mail para ${para} não foi enviado.`);
    return;
  }
  console.log(`[e-mail] para: ${para} | assunto: ${assunto}\n${texto}`);
}

module.exports = { enviar };
