async function enviar(para, assunto, texto) {
  console.log(`[e-mail] para: ${para} | assunto: ${assunto}\n${texto}`);
}

module.exports = { enviar };
