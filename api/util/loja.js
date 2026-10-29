const pool = require("../config/database");
const { ErroApi } = require("./erros");

const HORARIO = /^([0-6])-([0-6]) ([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/;
const horarioEnv = String(process.env.SABOR_HORARIO || "").trim();

const PADRAO = {
  nome: "Restaurante Sabor Caseiro",
  endereco: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
  telefone: "(11) 3254-7689",
  prazo_entrega: "30–45 min",
  prazo_retirada: "15–25 min",
  horario: HORARIO.test(horarioEnv) ? horarioEnv : "1-6 08:00-22:10",
};

const LIMITES = { nome: [2, 80], endereco: [5, 160], telefone: [8, 30], prazo_entrega: [2, 30], prazo_retirada: [2, 30] };
const CACHE_MS = 5000;
let cache = null;

async function lerLoja() {
  if (cache && cache.ate > Date.now()) return cache.dados;
  const { rows } = await pool.query("SELECT chave, valor FROM loja_config");
  const dados = { ...PADRAO };
  for (const r of rows) if (r.chave in PADRAO) dados[r.chave] = r.valor;
  cache = { dados, ate: Date.now() + CACHE_MS };
  return dados;
}

function validarHorario(valor) {
  const m = HORARIO.exec(String(valor || "").trim());
  if (!m) throw new ErroApi("Horário de funcionamento inválido.");
  if (Number(m[1]) > Number(m[2])) throw new ErroApi("O primeiro dia deve vir antes do último.");
  if (`${m[3]}${m[4]}` >= `${m[5]}${m[6]}`) throw new ErroApi("A abertura deve ser antes do fechamento.");
  return String(valor).trim();
}

function validarLoja(corpo) {
  const dados = {};
  for (const [campo, [min, max]] of Object.entries(LIMITES)) {
    const t = String(corpo[campo] ?? "").trim();
    if (t.length < min || t.length > max) throw new ErroApi(`Campo inválido: ${campo.replace("_", " ")}.`);
    dados[campo] = t;
  }
  if (dados.telefone.replace(/\D/g, "").length < 10) throw new ErroApi("Telefone inválido (inclua o DDD).");
  dados.horario = validarHorario(corpo.horario);
  return dados;
}

async function salvarLoja(corpo) {
  const dados = validarLoja(corpo || {});
  const con = await pool.connect();
  try {
    await con.query("BEGIN");
    for (const [chave, valor] of Object.entries(dados)) {
      await con.query(
        "INSERT INTO loja_config (chave, valor) VALUES ($1,$2) ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor",
        [chave, valor]
      );
    }
    await con.query("COMMIT");
  } catch (erro) {
    await con.query("ROLLBACK");
    throw erro;
  } finally {
    con.release();
  }
  cache = null;
  return lerLoja();
}

module.exports = { lerLoja, salvarLoja, HORARIO };
