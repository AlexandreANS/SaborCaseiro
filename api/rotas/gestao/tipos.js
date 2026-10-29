const express = require("express");
const pool = require("../../config/database");
const { ErroApi } = require("../../util/erros");
const { avisoTipo, confirmarExclusao } = require("../../util/uso");
const { texto, numero, inteiro, idDaRota, CATEGORIAS } = require("../../util/validar");

const rota = express.Router();

async function listar(id = null, con = pool) {
  const { rows } = await con.query(
    `SELECT t.id, t.nome, t.descricao, t.preco::float, t.ativo,
            COALESCE((SELECT json_agg(json_build_object('categoria', c.categoria, 'minimo', c.minimo, 'maximo', c.maximo) ORDER BY c.ordem)
                        FROM tipo_categorias c WHERE c.tipo_id = t.id), '[]') AS categorias,
            COALESCE((SELECT json_agg(ti.ingrediente_id ORDER BY ti.ingrediente_id) FROM tipo_ingredientes ti WHERE ti.tipo_id = t.id), '[]') AS produto_ids
       FROM tipos_marmita t WHERE ($1::int IS NULL OR t.id = $1) ORDER BY t.ordem, t.id`,
    [id]
  );
  return rows;
}

function ler(corpo) {
  const categorias = Array.isArray(corpo.categorias) ? corpo.categorias : [];
  const vistas = new Set();
  const lista = categorias.map((c) => {
    const categoria = String(c.categoria || "");
    if (!CATEGORIAS.includes(categoria) || categoria === "extra" || vistas.has(categoria)) throw new ErroApi("Categorias inválidas.");
    vistas.add(categoria);
    const minimo = inteiro(c.minimo ?? 0, "Mínimo");
    const maximo = inteiro(c.maximo ?? 1, "Máximo");
    if (maximo < minimo) throw new ErroApi("O máximo não pode ser menor que o mínimo.");
    return { categoria, minimo, maximo };
  });
  const ids = Array.isArray(corpo.produto_ids) ? corpo.produto_ids.map((i) => inteiro(i, "Produto", 1)) : [];
  return {
    nome: texto(corpo.nome, "Nome", 2, 80),
    descricao: String(corpo.descricao || "").trim().slice(0, 300),
    preco: numero(corpo.preco, "Preço"),
    ativo: corpo.ativo !== false,
    categorias: lista,
    produto_ids: [...new Set(ids)],
  };
}

async function gravar(id, d) {
  const con = await pool.connect();
  try {
    await con.query("BEGIN");
    if (id) {
      const r = await con.query("UPDATE tipos_marmita SET nome=$2, descricao=$3, preco=$4, ativo=$5 WHERE id=$1", [id, d.nome, d.descricao, d.preco, d.ativo]);
      if (!r.rowCount) throw new ErroApi("Tipo não encontrado.", 404);
      await con.query("DELETE FROM tipo_categorias WHERE tipo_id = $1", [id]);
      await con.query("DELETE FROM tipo_ingredientes WHERE tipo_id = $1", [id]);
    } else {
      const r = await con.query(
        "INSERT INTO tipos_marmita (nome, descricao, preco, ativo, ordem) VALUES ($1,$2,$3,$4,(SELECT COALESCE(MAX(ordem),0)+1 FROM tipos_marmita)) RETURNING id",
        [d.nome, d.descricao, d.preco, d.ativo]
      );
      id = r.rows[0].id;
    }
    for (let i = 0; i < d.categorias.length; i++) {
      const c = d.categorias[i];
      await con.query("INSERT INTO tipo_categorias (tipo_id, categoria, ordem, minimo, maximo) VALUES ($1,$2,$3,$4,$5)", [id, c.categoria, i + 1, c.minimo, c.maximo]);
    }
    for (const pid of d.produto_ids) {
      await con.query("INSERT INTO tipo_ingredientes (tipo_id, ingrediente_id) SELECT $1, id FROM ingredientes WHERE id = $2 AND categoria <> 'extra'", [id, pid]);
    }
    await con.query("COMMIT");
    return (await listar(id))[0];
  } catch (erro) {
    await con.query("ROLLBACK");
    if (erro.code === "23505") throw new ErroApi("Já existe um tipo com esse nome.", 409);
    if (erro.code === "23503") throw new ErroApi("Há produtos inexistentes na lista.");
    throw erro;
  } finally {
    con.release();
  }
}

rota.get("/", async (req, res) => res.json(await listar()));
rota.post("/", async (req, res) => res.status(201).json(await gravar(null, ler(req.body))));
rota.put("/:id", async (req, res) => res.json(await gravar(idDaRota(req.params.id), ler(req.body))));

rota.delete("/:id", async (req, res) => {
  const id = idDaRota(req.params.id);
  await confirmarExclusao(req, await avisoTipo(id));
  const { rowCount } = await pool.query("DELETE FROM tipos_marmita WHERE id = $1", [id]);
  if (!rowCount) throw new ErroApi("Tipo não encontrado.", 404);
  res.status(204).end();
});

module.exports = rota;
