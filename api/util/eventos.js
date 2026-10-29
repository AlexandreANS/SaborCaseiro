const pool = require("../config/database");

const canais = new Map();

function assinar(canal, req, res) {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");
  if (!canais.has(canal)) canais.set(canal, new Set());
  canais.get(canal).add(res);
  req.on("close", () => {
    const grupo = canais.get(canal);
    if (!grupo) return;
    grupo.delete(res);
    if (!grupo.size) canais.delete(canal);
  });
}

function emitir(canal, evento) {
  const grupo = canais.get(canal);
  if (!grupo) return;
  const texto = `data: ${JSON.stringify(evento)}\n\n`;
  for (const res of grupo) res.write(texto);
}

function avisarGerente(tipo, id) {
  emitir("gerente", { tipo, id });
}

async function avisarCliente(pedidoId, tipo) {
  try {
    const { rows } = await pool.query("SELECT cliente_id FROM pedidos WHERE id = $1", [pedidoId]);
    if (rows[0]) emitir("cliente:" + rows[0].cliente_id, { tipo, id: pedidoId });
  } catch {}
}

setInterval(() => {
  for (const grupo of canais.values()) for (const res of grupo) res.write(": ping\n\n");
}, 25000).unref();

module.exports = { assinar, emitir, avisarGerente, avisarCliente };
