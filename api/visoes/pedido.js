const PASSOS = {
  entrega: ["Esperando", "Preparando", "Saiu para Entrega", "Concluído"],
  retirada: ["Esperando", "Preparando", "Pronto para Retirada", "Concluído"],
};
const STATUS = ["Esperando", "Preparando", "Saiu para Entrega", "Pronto para Retirada", "Concluído", "Cancelado"];

function rotuloStatus(status, tipo, por = null) {
  if (status === "Esperando") return "Aguardando aceite";
  if (status === "Cancelado") return por === "cliente" ? "Cancelado" : "Recusado";
  if (status === "Concluído") return tipo === "retirada" ? "Retirado" : "Entregue";
  return status;
}

function proxima(status, tipo) {
  if (status === "Esperando") return { status: "Preparando", texto: "Aceitar pedido", curto: "Aceitar" };
  if (status === "Preparando" && tipo === "entrega")
    return { status: "Saiu para Entrega", texto: "Saiu para entrega", curto: "Saiu p/ entrega" };
  if (status === "Preparando") return { status: "Pronto para Retirada", texto: "Pronto para retirada", curto: "Pronto p/ retirada" };
  if (status === "Saiu para Entrega") return { status: "Concluído", texto: "Marcar como entregue", curto: "Entregue" };
  if (status === "Pronto para Retirada") return { status: "Concluído", texto: "Marcar como retirado", curto: "Retirado" };
  return null;
}

const anterior = (status) =>
  ["Saiu para Entrega", "Pronto para Retirada"].includes(status) ? { status: "Preparando", texto: "Voltar para preparando" } : null;

const comRotulo = (p) => ({
  ...p,
  status_rotulo: rotuloStatus(p.status, p.tipo_entrega, p.cancelado_por),
  proxima: proxima(p.status, p.tipo_entrega),
  anterior: anterior(p.status),
});

const passosDe = (tipo) => PASSOS[tipo].map((status) => ({ status, rotulo: rotuloStatus(status, tipo) }));

function contagem(linhas) {
  const resultado = Object.fromEntries(STATUS.map((s) => [s, 0]));
  linhas.forEach((l) => {
    resultado[l.status] = l.n;
  });
  return { ...resultado, total: linhas.reduce((soma, l) => soma + l.n, 0) };
}

module.exports = { PASSOS, STATUS, rotuloStatus, comRotulo, passosDe, contagem };
