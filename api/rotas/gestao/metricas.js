const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");

const rota = express.Router();
const FUSO = "America/Sao_Paulo";
const PERIODOS = { semana: { dias: 7, max: 8 }, quinzena: { dias: 15, max: 6 }, mes: { dias: 30, max: 6 } };

const arredondar = (n) => Math.round(n * 100) / 100;
const variacao = (atual, anterior) => (anterior ? arredondar(((atual - anterior) / anterior) * 100) : null);

function somarDias(iso, dias) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

rota.get("/", async (req, res) => {
  const periodo = req.query.periodo || "semana";
  const conf = PERIODOS[periodo];
  if (!conf) throw new ErroApi("Período inválido. Use semana, quinzena ou mes.");
  const { dias, max } = conf;

  const base = await pool.query(
    `SELECT to_char((now() AT TIME ZONE '${FUSO}')::date, 'YYYY-MM-DD') AS hoje,
            COALESCE(((now() AT TIME ZONE '${FUSO}')::date - (SELECT min((criado_em AT TIME ZONE '${FUSO}')::date) FROM pedidos WHERE status <> 'Cancelado')), 0)::int AS desde_primeiro`
  );
  const { hoje, desde_primeiro: desdePrimeiro } = base.rows[0];
  const quantos = Math.min(max, Math.floor(desdePrimeiro / dias) + 1);

  const pedidos = await pool.query(
    `WITH v AS (
       SELECT cliente_id, total, ((now() AT TIME ZONE '${FUSO}')::date - (criado_em AT TIME ZONE '${FUSO}')::date) / $1 AS b
         FROM pedidos WHERE status <> 'Cancelado'
     )
     SELECT b, count(*)::int AS pedidos, COALESCE(sum(total), 0)::float AS faturamento, count(DISTINCT cliente_id)::int AS ativos
       FROM v WHERE b < $2 GROUP BY b`,
    [dias, quantos]
  );
  const recorrentes = await pool.query(
    `WITH v AS (
       SELECT cliente_id, ((now() AT TIME ZONE '${FUSO}')::date - (criado_em AT TIME ZONE '${FUSO}')::date) / $1 AS b
         FROM pedidos WHERE status <> 'Cancelado'
     )
     SELECT b, count(*)::int AS n FROM (SELECT b, cliente_id FROM v WHERE b < $2 GROUP BY b, cliente_id HAVING count(*) >= 2) t GROUP BY b`,
    [dias, quantos]
  );
  const novos = await pool.query(
    `SELECT b, count(*)::int AS n FROM (
       SELECT ((now() AT TIME ZONE '${FUSO}')::date - (criado_em AT TIME ZONE '${FUSO}')::date) / $1 AS b FROM clientes
     ) t WHERE b < $2 GROUP BY b`,
    [dias, quantos]
  );

  const por = (linhas, campo) => new Map(linhas.map((l) => [Number(l.b), l[campo]]));
  const mp = new Map(pedidos.rows.map((l) => [Number(l.b), l]));
  const mr = por(recorrentes.rows, "n");
  const mn = por(novos.rows, "n");

  const serie = [];
  for (let b = quantos - 1; b >= 0; b--) {
    const l = mp.get(b) || { pedidos: 0, faturamento: 0, ativos: 0 };
    const fim = somarDias(hoje, -dias * b);
    serie.push({
      inicio: somarDias(fim, -(dias - 1)), fim,
      pedidos: l.pedidos, faturamento: arredondar(l.faturamento),
      ticket_medio: l.pedidos ? arredondar(l.faturamento / l.pedidos) : 0,
      clientes_ativos: l.ativos, clientes_novos: mn.get(b) || 0, clientes_recorrentes: mr.get(b) || 0,
    });
  }

  const atual = serie[serie.length - 1];
  const anterior = serie.length > 1 ? serie[serie.length - 2] : null;
  const somaPed = serie.reduce((s, x) => s + x.pedidos, 0);
  const somaFat = serie.reduce((s, x) => s + x.faturamento, 0);
  const media = {
    pedidos: arredondar(somaPed / serie.length),
    faturamento: arredondar(somaFat / serie.length),
    ticket_medio: somaPed ? arredondar(somaFat / somaPed) : 0,
    clientes_ativos: arredondar(serie.reduce((s, x) => s + x.clientes_ativos, 0) / serie.length),
    clientes_novos: arredondar(serie.reduce((s, x) => s + x.clientes_novos, 0) / serie.length),
  };

  const freq = await pool.query(
    `SELECT (CASE WHEN n >= 4 THEN 4 ELSE n END)::int AS faixa, count(*)::int AS clientes
       FROM (SELECT cliente_id, count(*) AS n FROM pedidos WHERE status <> 'Cancelado' GROUP BY cliente_id) t
      GROUP BY 1 ORDER BY 1`
  );
  const rotulos = { 1: "1 pedido", 2: "2 pedidos", 3: "3 pedidos", 4: "4 ou mais" };
  const faixas = [1, 2, 3, 4].map((f) => ({ faixa: rotulos[f], clientes: (freq.rows.find((r) => r.faixa === f) || { clientes: 0 }).clientes }));
  const compraram = faixas.reduce((s, f) => s + f.clientes, 0);
  const voltaram = faixas.slice(1).reduce((s, f) => s + f.clientes, 0);

  const top = await pool.query(
    `SELECT c.nome, count(*)::int AS pedidos, sum(p.total)::float AS total,
            to_char(max(p.criado_em AT TIME ZONE '${FUSO}'), 'YYYY-MM-DD') AS ultimo
       FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
      WHERE p.status <> 'Cancelado' AND (p.criado_em AT TIME ZONE '${FUSO}')::date > (now() AT TIME ZONE '${FUSO}')::date - $1::int
      GROUP BY c.id ORDER BY count(*) DESC, sum(p.total) DESC LIMIT 5`,
    [dias * quantos]
  );

  const doDia = await pool.query(
    `SELECT count(*)::int AS pedidos, COALESCE(sum(total), 0)::float AS faturamento FROM pedidos
      WHERE status <> 'Cancelado' AND (criado_em AT TIME ZONE '${FUSO}')::date = (now() AT TIME ZONE '${FUSO}')::date`
  );

  res.json({
    periodo, dias, hoje, hoje_resumo: doDia.rows[0], serie, media,
    resumo: {
      atual, anterior,
      variacao: anterior ? {
        pedidos: variacao(atual.pedidos, anterior.pedidos),
        faturamento: variacao(atual.faturamento, anterior.faturamento),
        ticket_medio: variacao(atual.ticket_medio, anterior.ticket_medio),
        clientes_ativos: variacao(atual.clientes_ativos, anterior.clientes_ativos),
      } : null,
    },
    recorrencia: {
      faixas, clientes_com_pedido: compraram, clientes_recorrentes: voltaram,
      taxa: compraram ? arredondar((voltaram / compraram) * 100) : 0,
    },
    mais_frequentes: top.rows.map((t) => ({ ...t, total: arredondar(t.total) })),
  });
});

module.exports = rota;
