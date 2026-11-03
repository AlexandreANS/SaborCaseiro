const Bairro = require("../modelos/bairro");
const { ErroApi } = require("../util/erros");

const URL_CEP = process.env.SABOR_CEP_URL || "https://viacep.com.br/ws";
const ESPERA = 5000;
const VALIDADE = 10 * 60 * 1000;
const guardados = new Map();

const numeros = (t) => String(t || "").replace(/\D/g, "");
const semAcento = (t) =>
  String(t || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const indisponivel = () => new ErroApi("Não foi possível consultar o CEP agora. Tente novamente em instantes.", 503);

async function consultar(cep) {
  const guardado = guardados.get(cep);
  if (guardado && guardado.ate > Date.now()) return guardado.dados;
  let dados;
  try {
    const resp = await fetch(`${URL_CEP}/${cep}/json/`, { signal: AbortSignal.timeout(ESPERA) });
    if (!resp.ok) throw indisponivel();
    dados = await resp.json();
  } catch (erro) {
    throw erro instanceof ErroApi ? erro : indisponivel();
  }
  if (dados.erro) throw new ErroApi("CEP não encontrado.", 404);
  guardados.set(cep, { dados, ate: Date.now() + VALIDADE });
  return dados;
}

async function localizar(entrada) {
  const cep = numeros(entrada);
  if (cep.length !== 8) throw new ErroApi("CEP inválido. Informe os 8 números.");
  const dados = await consultar(cep);
  const nome = String(dados.bairro || "").trim();
  if (!nome) throw new ErroApi("Esse CEP não informa o bairro. Use o CEP da rua da entrega.", 422);
  const bairro = (await Bairro.ativos()).find((b) => semAcento(b.nome) === semAcento(nome));
  if (!bairro) throw new ErroApi(`Ainda não entregamos no bairro ${nome}.`, 422);
  return {
    cep: `${cep.slice(0, 5)}-${cep.slice(5)}`,
    rua: dados.logradouro || "",
    cidade: dados.localidade || "",
    uf: dados.uf || "",
    bairro,
  };
}

module.exports = { localizar };
