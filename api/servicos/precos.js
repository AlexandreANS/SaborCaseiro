const pool = require("../config/database");
const { ErroApi } = require("../util/erros");
const Cardapio = require("../modelos/cardapio");
const Tipo = require("../modelos/tipo");
const Produto = require("../modelos/produto");
const Bairro = require("../modelos/bairro");
const Cupom = require("../modelos/cupom");
const Cliente = require("../modelos/cliente");

const ROTULO = { carboidrato: "carboidrato", proteina: "proteína", acompanhamento: "acompanhamento", salada: "salada" };
const arred = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

async function cotar(itens, opc = {}, con = pool) {
  if (!Array.isArray(itens) || itens.length === 0) throw new ErroApi("O carrinho está vazio.");
  if (itens.length > 30) throw new ErroApi("Itens demais no carrinho.");

  for (const it of itens) {
    if (!Number.isInteger(Number(it.extra_id ?? it.tipo_id))) throw new ErroApi("Item de carrinho inválido.");
    for (const id of [...(it.ingredientes || []), ...(it.adicionais || [])]) {
      if (!Number.isInteger(Number(id))) throw new ErroApi("Item de carrinho inválido.");
    }
  }

  const menu = await Cardapio.publicadoHoje(con);
  if (!menu) throw new ErroApi("O cardápio de hoje ainda não foi publicado.");

  const idsTipo = [...new Set(itens.filter((i) => !i.extra_id).map((i) => Number(i.tipo_id)))];
  const { tipos, regras, liberados } = await Tipo.paraCotacao(idsTipo, con);
  const extrasBd = await Produto.extrasAtivos(con);

  const porTipo = new Map(tipos.map((t) => [t.id, t]));
  const porExtra = new Map(extrasBd.filter((e) => menu.produtoIds.has(e.id)).map((e) => [e.id, e]));

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
      lista.push({
        tipo_id: null,
        produto_id: ex.id,
        extra: true,
        tipo_nome: ex.nome,
        quantidade: q,
        observacoes: null,
        preco_unitario: arred(ex.preco_extra),
        ingredientes: [],
      });
      continue;
    }
    const tipo = porTipo.get(Number(it.tipo_id));
    if (!tipo || !menu.tipoIds.has(tipo.id)) throw new ErroApi("Tipo de marmita indisponível hoje.");
    const qtd = Number(it.quantidade);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) throw new ErroApi("Quantidade inválida (de 1 a 20).");

    const doTipo = new Map(liberados.filter((l) => l.tipo_id === tipo.id && menu.produtoIds.has(l.id)).map((l) => [l.id, l]));
    const buscar = (id) => {
      const ing = doTipo.get(id);
      if (!ing) throw new ErroApi(`Opção indisponível para ${tipo.nome}.`);
      return ing;
    };
    const marcados = [...new Set((it.ingredientes || []).map(Number))].map(buscar);
    const adicionais = (it.adicionais || []).map(Number).map(buscar);

    const regrasTipo = regras.filter((r) => r.tipo_id === tipo.id);
    for (const r of regrasTipo) {
      const nome = ROTULO[r.categoria] || r.categoria;
      const principais = marcados.filter((m) => m.categoria === r.categoria).length;
      const extras = adicionais.filter((m) => m.categoria === r.categoria).length;
      if (principais !== r.minimo) throw new ErroApi(`Escolha ${r.minimo} opção(ões) de ${nome} em ${tipo.nome}.`);
      if (principais + extras > r.maximo)
        throw new ErroApi(`Em ${tipo.nome} cabem no máximo ${r.maximo} opção(ões) de ${nome}, contando os adicionais.`);
    }
    const cats = new Set(regrasTipo.map((r) => r.categoria));
    if ([...marcados, ...adicionais].some((m) => !cats.has(m.categoria))) throw new ErroApi(`Opção inválida para ${tipo.nome}.`);

    const baseUn = Number(tipo.preco);
    const adicUn = adicionais.reduce((soma, i) => soma + Number(i.preco_extra), 0);
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
      ingredientes: [
        ...marcados.map((i) => ({ id: i.id, nome: i.nome, categoria: i.categoria, preco_extra: 0, adicional: false })),
        ...adicionais.map((i) => ({ id: i.id, nome: i.nome, categoria: i.categoria, preco_extra: Number(i.preco_extra), adicional: true })),
      ],
    });
  }

  base = arred(base);
  adic = arred(adic);

  let cupom = null;
  let desconto = 0;
  let msgCupom = null;
  if (opc.cupom) {
    const codigo = String(opc.cupom).trim().toUpperCase();
    const cp = await Cupom.ativo(codigo, con);
    if (!cp) {
      msgCupom = "Cupom inválido.";
    } else if (cp.valido_ate && cp.valido_ate < (await Cardapio.hoje(con))) {
      msgCupom = "Este cupom está vencido.";
    } else if (cp.valor_minimo > base + adic) {
      msgCupom = `Este cupom vale para pedidos a partir de R$ ${cp.valor_minimo.toFixed(2).replace(".", ",")}.`;
    } else if (cp.apenas_primeiro_pedido && opc.clienteId && (await Cliente.jaPediu(opc.clienteId, con))) {
      msgCupom = "Este cupom vale apenas para o primeiro pedido.";
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
      const achado = await Bairro.ativo(Number(opc.bairro_id), con);
      if (!achado) throw new ErroApi("Não entregamos nesse bairro.");
      taxa = achado.taxa_entrega;
      bairro = achado;
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
