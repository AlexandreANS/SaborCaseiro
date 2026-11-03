const pool = require("../config/database");

const FUSO = "America/Sao_Paulo";

async function base() {
  const { rows } = await pool.query(
    `SELECT to_char((now() AT TIME ZONE '${FUSO}')::date, 'YYYY-MM-DD') AS hoje,
            COALESCE(((now() AT TIME ZONE '${FUSO}')::date - (SELECT min((criado_em AT TIME ZONE '${FUSO}')::date) FROM pedidos WHERE status <> 'Cancelado')), 0)::int AS desde_primeiro`
  );
  return rows[0];
}

async function pedidos(dias, quantos) {
  const { rows } = await pool.query(
    `WITH v AS (
       SELECT cliente_id, total, ((now() AT TIME ZONE '${FUSO}')::date - (criado_em AT TIME ZONE '${FUSO}')::date) / $1 AS b
         FROM pedidos WHERE status <> 'Cancelado'
     )
     SELECT b, count(*)::int AS pedidos, COALESCE(sum(total), 0)::float AS faturamento, count(DISTINCT cliente_id)::int AS ativos
       FROM v WHERE b < $2 GROUP BY b`,
    [dias, quantos]
  );
  return rows;
}

async function recorrentes(dias, quantos) {
  const { rows } = await pool.query(
    `WITH v AS (
       SELECT cliente_id, ((now() AT TIME ZONE '${FUSO}')::date - (criado_em AT TIME ZONE '${FUSO}')::date) / $1 AS b
         FROM pedidos WHERE status <> 'Cancelado'
     )
     SELECT b, count(*)::int AS n FROM (SELECT b, cliente_id FROM v WHERE b < $2 GROUP BY b, cliente_id HAVING count(*) >= 2) t GROUP BY b`,
    [dias, quantos]
  );
  return rows;
}

async function novos(dias, quantos) {
  const { rows } = await pool.query(
    `SELECT b, count(*)::int AS n FROM (
       SELECT ((now() AT TIME ZONE '${FUSO}')::date - (criado_em AT TIME ZONE '${FUSO}')::date) / $1 AS b FROM clientes
     ) t WHERE b < $2 GROUP BY b`,
    [dias, quantos]
  );
  return rows;
}

async function frequencia() {
  const { rows } = await pool.query(
    `SELECT (CASE WHEN n >= 4 THEN 4 ELSE n END)::int AS faixa, count(*)::int AS clientes
       FROM (SELECT cliente_id, count(*) AS n FROM pedidos WHERE status <> 'Cancelado' GROUP BY cliente_id) t
      GROUP BY 1 ORDER BY 1`
  );
  return rows;
}

async function maisFrequentes(dias) {
  const { rows } = await pool.query(
    `SELECT c.nome, count(*)::int AS pedidos, sum(p.total)::float AS total,
            to_char(max(p.criado_em AT TIME ZONE '${FUSO}'), 'YYYY-MM-DD') AS ultimo
       FROM pedidos p JOIN clientes c ON c.id = p.cliente_id
      WHERE p.status <> 'Cancelado' AND (p.criado_em AT TIME ZONE '${FUSO}')::date > (now() AT TIME ZONE '${FUSO}')::date - $1::int
      GROUP BY c.id ORDER BY count(*) DESC, sum(p.total) DESC LIMIT 5`,
    [dias]
  );
  return rows;
}

async function doDia() {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS pedidos, COALESCE(sum(total), 0)::float AS faturamento FROM pedidos
      WHERE status <> 'Cancelado' AND (criado_em AT TIME ZONE '${FUSO}')::date = (now() AT TIME ZONE '${FUSO}')::date`
  );
  return rows[0];
}

module.exports = { base, pedidos, recorrentes, novos, frequencia, maisFrequentes, doDia };
