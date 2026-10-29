const express = require("express");
const pool = require("../config/database");
const { exigirLogin } = require("../util/seguranca");
const { cotar } = require("../util/precos");
const { buscarPedido, listarMensagens, comRotulo } = require("../util/pedidos");
const { ErroApi } = require("../util/erros");
const { assinar, avisarGerente, emitir } = require("../util/eventos");
const { validarHorario } = require("../util/funcionamento");

const rotas = express.Router();
rotas.use(exigirLogin);

function idPedido(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ErroApi("Pedido não encontrado.", 404);
  return id;
}

async function pedidoDoCliente(req) {
  const pedido = await buscarPedido(idPedido(req), req.clienteId);
  if (!pedido) throw new ErroApi("Pedido não encontrado.", 404);
  return pedido;
}

rotas.post("/", async (req, res) => {
  const d = req.body || {};
  const nome = String(d.nome || "").trim();
  const telefone = String(d.telefone || "").trim();
  if (nome.length < 2) throw new ErroApi("Informe o nome para o pedido.");
  if (telefone.replace(/\D/g, "").length < 10) throw new ErroApi("Telefone inválido (inclua o DDD).");
  if (!["entrega", "retirada"].includes(d.tipo_entrega)) throw new ErroApi("Escolha entrega ou retirada.");
  const entrega = d.tipo_entrega === "entrega";
  const aceitos = entrega ? ["pix", "cartao"] : ["pix", "cartao", "dinheiro"];
  if (!aceitos.includes(d.forma_pagamento)) {
    throw new ErroApi(entrega ? "Na entrega o pagamento é apenas Pix ou cartão." : "Escolha a forma de pagamento.");
  }

  const ender = d.endereco || {};
  if (entrega) {
    if (!ender.rua || !ender.numero) throw new ErroApi("Informe rua e número para a entrega.");
    if (!d.bairro_id) throw new ErroApi("Escolha o bairro da entrega.");
  }

  let horario = null;
  if (d.horario && d.horario !== "asap") {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.horario)) throw new ErroApi("Horário inválido.");
    horario = d.horario;
  }
  await validarHorario(horario);
  let troco = null;
  if (d.forma_pagamento === "dinheiro" && d.troco_para) {
    troco = Number(d.troco_para);
    if (!(troco > 0)) throw new ErroApi("Valor de troco inválido.");
  }

  const con = await pool.connect();
  try {
    await con.query("BEGIN");
    const cot = await cotar(d.itens, {
      tipo_entrega: d.tipo_entrega, bairro_id: d.bairro_id, cupom: d.cupom, clienteId: req.clienteId,
    }, con);
    if (d.cupom && !cot.cupom) throw new ErroApi(cot.cupom_mensagem || "Cupom inválido.");
    if (troco !== null && troco < cot.total) throw new ErroApi("O valor do troco deve ser maior ou igual ao total do pedido.");

    const { rows } = await con.query(
      `INSERT INTO pedidos (cliente_id, tipo_entrega, nome_cliente, telefone, cep, rua, numero, complemento,
                            bairro_id, bairro_nome, forma_pagamento, troco_para, horario_agendado, observacoes,
                            cupom, subtotal, adicionais, desconto, taxa_entrega, total)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
      [req.clienteId, d.tipo_entrega, nome, telefone,
       entrega ? ender.cep || null : null,
       entrega ? ender.rua : null,
       entrega ? ender.numero : null,
       entrega ? ender.complemento || null : null,
       cot.bairro ? cot.bairro.id : null, cot.bairro ? cot.bairro.nome : null,
       d.forma_pagamento, troco, horario,
       d.observacoes ? String(d.observacoes).slice(0, 500) : null,
       cot.cupom, cot.subtotal, cot.adicionais, cot.desconto, cot.taxa_entrega || 0, cot.total]
    );
    const pedidoId = rows[0].id;

    for (const item of cot.itens) {
      const novo = await con.query(
        `INSERT INTO pedido_itens (pedido_id, tipo_id, tipo_nome, extra, produto_id, quantidade, preco_unitario, observacoes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [pedidoId, item.tipo_id, item.tipo_nome, item.extra, item.produto_id, item.quantidade, item.preco_unitario, item.observacoes]
      );
      for (const ing of item.ingredientes) {
        await con.query(
          "INSERT INTO pedido_item_ingredientes (item_id, ingrediente_id, nome, categoria, preco_extra) VALUES ($1,$2,$3,$4,$5)",
          [novo.rows[0].id, ing.id, ing.nome, ing.categoria, ing.preco_extra]
        );
      }
    }

    if (d.salvar_endereco && entrega) {
      await con.query(
        `INSERT INTO enderecos (cliente_id, cep, rua, numero, complemento, bairro_id) VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (cliente_id) DO UPDATE SET cep=$2, rua=$3, numero=$4, complemento=$5, bairro_id=$6`,
        [req.clienteId, ender.cep || null, ender.rua, ender.numero, ender.complemento || null, cot.bairro.id]
      );
    }

    await con.query("COMMIT");
    avisarGerente("novo", pedidoId);
    emitir("cliente:" + req.clienteId, { tipo: "novo", id: pedidoId });
    res.status(201).json(await buscarPedido(pedidoId, req.clienteId));
  } catch (erro) {
    await con.query("ROLLBACK");
    throw erro;
  } finally {
    con.release();
  }
});

rotas.get("/eventos", (req, res) => {
  assinar("cliente:" + req.clienteId, req, res);
});

rotas.get("/", async (req, res) => {
  const limite = Math.min(200, Math.max(1, Number(req.query.limite) || 20));
  const { rows } = await pool.query(
    `SELECT p.id, p.status, p.tipo_entrega, p.forma_pagamento, p.total::float, p.criado_em, p.cancelado_por,
            (SELECT string_agg(pi.quantidade || 'x ' || pi.tipo_nome, ', ' ORDER BY pi.extra, pi.id) FROM pedido_itens pi WHERE pi.pedido_id = p.id) AS resumo,
            (SELECT count(*)::int FROM mensagens m WHERE m.pedido_id = p.id) AS total_msgs
       FROM pedidos p WHERE p.cliente_id = $1 ORDER BY p.id DESC LIMIT $2`,
    [req.clienteId, limite]
  );
  res.json(rows.map(comRotulo));
});

rotas.get("/:id", async (req, res) => {
  res.json(await pedidoDoCliente(req));
});

rotas.post("/:id/cancelar", async (req, res) => {
  const pedido = await pedidoDoCliente(req);
  const con = await pool.connect();
  try {
    await con.query("BEGIN");
    const { rowCount } = await con.query(
      "UPDATE pedidos SET status = 'Cancelado', cancelado_por = 'cliente' WHERE id = $1 AND cliente_id = $2 AND status = 'Esperando'",
      [pedido.id, req.clienteId]
    );
    if (!rowCount) throw new ErroApi("O restaurante já respondeu ao pedido. Fale com a equipe pelo chat.", 409);
    await con.query("INSERT INTO mensagens (pedido_id, autor, texto) VALUES ($1, 'cliente', 'Pedido cancelado pelo cliente.')", [pedido.id]);
    await con.query("COMMIT");
  } catch (erro) {
    await con.query("ROLLBACK");
    throw erro;
  } finally {
    con.release();
  }
  avisarGerente("pedido", pedido.id);
  res.json(await pedidoDoCliente(req));
});

rotas.get("/:id/repetir", async (req, res) => {
  const pedido = await pedidoDoCliente(req);
  const { rows } = await pool.query(
    `SELECT i.id, i.tipo_id, i.tipo_nome, i.extra, i.produto_id, i.quantidade, i.observacoes,
            COALESCE((SELECT array_agg(x.ingrediente_id ORDER BY x.ingrediente_id) FROM pedido_item_ingredientes x WHERE x.item_id = i.id), '{}') AS ingredientes,
            (SELECT count(*)::int FROM pedido_item_ingredientes x WHERE x.item_id = i.id AND x.ingrediente_id IS NULL) AS orfaos
       FROM pedido_itens i WHERE i.pedido_id = $1 ORDER BY i.id`,
    [pedido.id]
  );
  const itens = [];
  const indisponiveis = [];
  for (const r of rows) {
    const item = r.extra
      ? { extra_id: r.produto_id, quantidade: r.quantidade }
      : { tipo_id: r.tipo_id, ingredientes: r.ingredientes.filter((x) => x), quantidade: r.quantidade, observacoes: r.observacoes || "" };
    try {
      if (r.orfaos || (r.extra ? !r.produto_id : !r.tipo_id)) throw new ErroApi("indisponível");
      await cotar([item], { tipo_entrega: "retirada" });
      itens.push(item);
    } catch (erro) {
      if (!(erro instanceof ErroApi)) throw erro;
      indisponiveis.push(r.tipo_nome);
    }
  }
  res.json({ itens, indisponiveis });
});

rotas.get("/:id/mensagens", async (req, res) => {
  const pedido = await pedidoDoCliente(req);
  res.json(await listarMensagens(pedido.id));
});

rotas.post("/:id/mensagens", async (req, res) => {
  const pedido = await pedidoDoCliente(req);
  const texto = String((req.body || {}).texto || "").trim();
  if (!texto || texto.length > 500) throw new ErroApi("Escreva uma mensagem de até 500 caracteres.");
  const { rows } = await pool.query(
    "INSERT INTO mensagens (pedido_id, autor, texto) VALUES ($1, 'cliente', $2) RETURNING id, autor, texto, criado_em",
    [pedido.id, texto]
  );
  avisarGerente("mensagem", pedido.id);
  res.status(201).json(rows[0]);
});

module.exports = rotas;
