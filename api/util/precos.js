const pool = require("../config/database");
const { ErroApi } = require("./erros");
const { hoje, publicadoHoje } = require("./cardapio");

const ROTULO = { carboidrato: "carboidrato", proteina: "proteína", acompanhamento: "acompanhamento", salada: "salada" };
const arred = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function cotar(itens, opc = {}, con = pool) {
  if (!Array.isArray(itens) || itens.length === 0) throw new ErroApi("O carrinho está vazio.");
  if (itens.length > 30) throw new ErroApi("Itens demais no carrinho.");

  for (const it of itens) {
    if (!Number.isInteger(Number(it.extra_id ?? it.tipo_id))) throw new ErroApi("Item de carrinho inválido.");
    for (const id of it.ingredientes || []) {
      if (!Number.isInteger(Number(id))) throw new ErroApi("Item de carrinho inválido.");
    }
  }

  const menu = await publicadoHoje(con);
  if (!menu) throw new ErroApi("O cardápio de hoje ainda não foi publicado.");

  const idsTipo = [...new Set(itens.filter((i) => !i.extra_id).map((i) => Number(i.tipo_id)))];
  const tipos = await con.query("SELECT id, nome, preco FROM tipos_marmita WHERE ativo AND id = ANY($1)", [idsTipo]);
  const regras = await con.query("SELECT tipo_id, categoria, minimo, maximo FROM tipo_categorias WHERE tipo_id = ANY($1)", [idsTipo]);
  const liberados = await con.query(
    `SELECT ti.tipo_id, i.id, i.nome, i.categoria, i.preco_extra
       FROM tipo_ingredientes ti JOIN ingredientes i ON i.id = ti.ingrediente_id
      WHERE i.ativo AND ti.tipo_id = ANY($1)`,
    [idsTipo]
  );
  const extrasBd = await con.query("SELECT id, nome, categoria, preco_extra FROM ingredientes WHERE ativo AND categoria = 'extra'");

  const porTipo = new Map(tipos.rows.map((t) => [t.id, t]));
  const porExtra = new Map(extrasBd.rows.filter((e) => menu.produtoIds.has(e.id)).map((e) => [e.id, e]));

  let base = 0;
  let adic = 0;
  const lista = [];

  for (const it of itens) {
    if (it.extra_id) {
      const ex = porExtra.get(Number(it.extra_id));
      if (!ex) throw new ErroApi("Item extra indisponível hoje.");
      const q = Number(it.quantidade);
      if (!Number.isInteger(q) || q < 1 || q > 20) throw new ErroApi("Quantidade inválida (de 1 a 20).");
      base += Number(ex.preco_extra) * q;
      lista.push({ tipo_id: null, produto_id: ex.id, extra: true, tipo_nome: ex.nome, quantidade: q, observacoes: null, preco_unitario: arred(ex.preco_extra), ingredientes: [] });
      continue;
    }
    const tipo = porTipo.get(Number(it.tipo_id));
    if (!tipo || !menu.tipoIds.has(tipo.id)) throw new ErroApi("Tipo de marmita indisponível hoje.");
    const qtd = Number(it.quantidade);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) throw new ErroApi("Quantidade inválida (de 1 a 20).");

    const doTipo = new Map(
      liberados.rows.filter((l) => l.tipo_id === tipo.id && menu.produtoIds.has(l.id)).map((l) => [l.id, l])
    );
    const ids = [...new Set((it.ingredientes || []).map(Number))];
    const marcados = ids.map((id) => {
      const ing = doTipo.get(id);
      if (!ing) throw new ErroApi(`Opção indisponível para ${tipo.nome}.`);
      return ing;
    });

    const regrasTipo = regras.rows.filter((r) => r.tipo_id === tipo.id);
    for (const r of regrasTipo) {
      const n = marcados.filter((m) => m.categoria === r.categoria).length;
      if (n < r.minimo || n > r.maximo) {
        const faixa = r.minimo === r.maximo ? `${r.minimo}` : `${r.minimo} a ${r.maximo}`;
        throw new ErroApi(`Escolha ${faixa} opção(ões) de ${ROTULO[r.categoria] || r.categoria} em ${tipo.nome}.`);
      }
    }
    const cats = new Set(regrasTipo.map((r) => r.categoria));
    if (marcados.some((m) => !cats.has(m.categoria))) throw new ErroApi(`Opção inválida para ${tipo.nome}.`);

    const baseUn = Number(tipo.preco);
    const adicUn = marcados.reduce((s, i) => s + Number(i.preco_extra), 0);
    base += baseUn * qtd;
    adic += adicUn * qtd;

    lista.push({
      tipo_id: tipo.id,
      produto_id: null,
      extra: false,
      tipo_nome: tipo.nome,
      quantidade: qtd,
      observacoes: it.observacoes ? String(it.observacoes).slice(0, 300) : null,
      preco_unitario: arred(baseUn + adicUn),
      ingredientes: marcados.map((i) => ({
        id: i.id, nome: i.nome, categoria: i.categoria, preco_extra: Number(i.preco_extra),
      })),
    });
  }

  base = arred(base);
  adic = arred(adic);

  let cupom = null;
  let desconto = 0;
  let msgCupom = null;
  if (opc.cupom) {
    const codigo = String(opc.cupom).trim().toUpperCase();
    const { rows } = await con.query(
      "SELECT codigo, percentual, apenas_primeiro_pedido, valor_minimo, to_char(valido_ate, 'YYYY-MM-DD') AS valido_ate FROM cupons WHERE codigo = $1 AND ativo",
      [codigo]
    );
    const cp = rows[0];
    if (!cp) {
      msgCupom = "Cupom inválido.";
    } else if (cp.valido_ate && cp.valido_ate < (await hoje(con))) {
      msgCupom = "Este cupom está vencido.";
    } else if (Number(cp.valor_minimo) > base + adic) {
      msgCupom = `Este cupom vale para pedidos a partir de R$ ${Number(cp.valor_minimo).toFixed(2).replace(".", ",")}.`;
    } else if (cp.apenas_primeiro_pedido && opc.clienteId) {
      const antes = await con.query(
        "SELECT 1 FROM pedidos WHERE cliente_id = $1 AND status <> 'Cancelado' LIMIT 1", [opc.clienteId]);
      if (antes.rows.length) msgCupom = "Este cupom vale apenas para o primeiro pedido.";
    }
    if (cp && !msgCupom) {
      cupom = cp.codigo;
      desconto = arred((base + adic) * (Number(cp.percentual) / 100));
    }
  }

  let taxa = 0;
  let bairro = null;
  if (opc.tipo_entrega === "entrega") {
    if (opc.bairro_id) {
      const { rows } = await con.query("SELECT id, nome, taxa_entrega FROM bairros WHERE ativo AND id = $1", [Number(opc.bairro_id)]);
      if (!rows[0]) throw new ErroApi("Não entregamos nesse bairro.");
      taxa = Number(rows[0].taxa_entrega);
      bairro = { id: rows[0].id, nome: rows[0].nome, taxa_entrega: taxa };
    } else {
      taxa = null;
    }
  }

  return {
    itens: lista,
    subtotal: base,
    adicionais: adic,
    desconto,
    cupom,
    cupom_mensagem: msgCupom,
    taxa_entrega: taxa,
    bairro,
    total: arred(base + adic - desconto + (taxa || 0)),
  };
}

module.exports = { cotar, arred };
