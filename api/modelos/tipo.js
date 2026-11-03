const pool = require("../config/database");
const transacao = require("./transacao");
const { ErroApi, repetido } = require("../util/erros");

async function listar(id = null) {
  const { rows } = await pool.query(
    `SELECT t.id, t.nome, t.descricao, t.preco::float, t.ativo,
            COALESCE((SELECT json_agg(json_build_object('categoria', c.categoria, 'minimo', c.minimo, 'maximo', c.maximo) ORDER BY c.ordem)
                        FROM tipo_categorias c WHERE c.tipo_id = t.id), '[]') AS categorias,
            COALESCE((SELECT json_agg(ti.ingrediente_id ORDER BY ti.ingrediente_id) FROM tipo_ingredientes ti WHERE ti.tipo_id = t.id), '[]') AS produto_ids
       FROM tipos_marmita t WHERE ($1::int IS NULL OR t.id = $1) ORDER BY t.ordem, t.id`,
    [id]
  );
  return rows;
}

async function gravar(id, d) {
  const gravado = await transacao(async (con) => {
    let alvo = id;
    if (alvo) {
      const r = await con.query("UPDATE tipos_marmita SET nome=$2, descricao=$3, preco=$4, ativo=$5 WHERE id=$1", [
        alvo,
        d.nome,
        d.descricao,
        d.preco,
        d.ativo,
      ]);
      if (!r.rowCount) throw new ErroApi("Tipo não encontrado.", 404);
      await con.query("DELETE FROM tipo_categorias WHERE tipo_id = $1", [alvo]);
      await con.query("DELETE FROM tipo_ingredientes WHERE tipo_id = $1", [alvo]);
    } else {
      const r = await con.query(
        "INSERT INTO tipos_marmita (nome, descricao, preco, ativo, ordem) VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(ordem),0)+1 FROM tipos_marmita)) RETURNING id",
        [d.nome, d.descricao, d.preco, d.ativo]
      );
      alvo = r.rows[0].id;
    }
    for (let i = 0; i < d.categorias.length; i++) {
      const c = d.categorias[i];
      await con.query("INSERT INTO tipo_categorias (tipo_id, categoria, ordem, minimo, maximo) VALUES ($1,$2,$3,$4,$5)", [
        alvo,
        c.categoria,
        i + 1,
        c.minimo,
        c.maximo,
      ]);
    }
    for (const pid of d.produto_ids) {
      await con.query(
        "INSERT INTO tipo_ingredientes (tipo_id, ingrediente_id) SELECT $1, id FROM ingredientes WHERE id = $2 AND categoria <> 'extra'",
        [alvo, pid]
      );
    }
    return alvo;
  }).catch((erro) => {
    if (erro.code === "23503") throw new ErroApi("Há produtos inexistentes na lista.");
    return repetido("Já existe um tipo com esse nome.")(erro);
  });
  return (await listar(gravado))[0];
}

async function remover(id) {
  const { rowCount } = await pool.query("DELETE FROM tipos_marmita WHERE id = $1", [id]);
  return rowCount > 0;
}

async function paraCotacao(ids, con = pool) {
  const tipos = await con.query("SELECT id, nome, preco FROM tipos_marmita WHERE ativo AND id = ANY($1)", [ids]);
  const regras = await con.query("SELECT tipo_id, categoria, minimo, maximo FROM tipo_categorias WHERE tipo_id = ANY($1)", [ids]);
  const liberados = await con.query(
    `SELECT ti.tipo_id, i.id, i.nome, i.categoria, i.preco_extra
       FROM tipo_ingredientes ti JOIN ingredientes i ON i.id = ti.ingrediente_id
      WHERE i.ativo AND ti.tipo_id = ANY($1)`,
    [ids]
  );
  return { tipos: tipos.rows, regras: regras.rows, liberados: liberados.rows };
}

module.exports = { listar, gravar, remover, paraCotacao };
