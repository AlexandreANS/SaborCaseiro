const { ErroApi } = require("./erros");
const { lerLoja, HORARIO } = require("./loja");

const NOMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const FUSO = "America/Sao_Paulo";
const SEMPRE = String(process.env.SABOR_HORARIO || "").trim() === "sempre";

const minutos = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const curto = (hhmm) => (hhmm.slice(3) === "00" ? `${Number(hhmm.slice(0, 2))}h` : `${Number(hhmm.slice(0, 2))}h${hhmm.slice(3)}`);

function agora(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-GB", { timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(data);
  const pega = (tipo) => partes.find((p) => p.type === tipo).value;
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(pega("weekday"));
  return { dia, hhmm: `${pega("hour")}:${pega("minute")}` };
}

function textoDias(ini, fim) {
  return ini === fim ? NOMES[ini] : `${NOMES[ini]} a ${NOMES[fim]}`;
}

async function estado(data = new Date()) {
  const { dia, hhmm } = agora(data);
  if (SEMPRE) return { sempre: true, aberto: true, texto: "Todos os dias", abre: "00:00", fecha: "23:59", agora: hhmm, dia_aberto: true };
  const m = HORARIO.exec((await lerLoja()).horario);
  const de = Number(m[1]);
  const ate = Number(m[2]);
  const abre = `${m[3]}:${m[4]}`;
  const fecha = `${m[5]}:${m[6]}`;
  const diaAberto = dia >= de && dia <= ate;
  const aberto = diaAberto && minutos(hhmm) >= minutos(abre) && minutos(hhmm) < minutos(fecha);
  return {
    sempre: false, aberto, dia_aberto: diaAberto, abre, fecha, agora: hhmm,
    texto: `${textoDias(de, ate)}, das ${curto(abre)} às ${curto(fecha)}`,
  };
}

async function validarHorario(horario, data = new Date()) {
  const e = await estado(data);
  if (e.sempre) return;
  if (!e.dia_aberto) throw new ErroApi(`Hoje não temos atendimento. Funcionamos ${e.texto}.`);
  if (!horario) {
    if (!e.aberto) throw new ErroApi(`Estamos fechados agora. Funcionamos ${e.texto}. Se ainda houver expediente hoje, agende um horário.`);
    return;
  }
  if (minutos(horario) < minutos(e.abre) || minutos(horario) > minutos(e.fecha)) {
    throw new ErroApi(`Escolha um horário entre ${curto(e.abre)} e ${curto(e.fecha)}.`);
  }
  if (minutos(horario) <= minutos(e.agora)) throw new ErroApi("Escolha um horário que ainda não passou.");
}

module.exports = { estado, validarHorario };
