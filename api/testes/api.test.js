const test = require("node:test");
const assert = require("node:assert/strict");

const BASE = (process.env.API_URL || "http://localhost:3000") + "/api";
const GERENTE = { email: process.env.GERENTE_EMAIL || "gerente@saborcaseiro.com.br", senha: process.env.GERENTE_SENHA || "gerente123" };
const unico = Date.now().toString(36);

async function chamar(metodo, caminho, corpo, token) {
  const resp = await fetch(BASE + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  let dados = null;
  try { dados = await resp.json(); } catch {}
  return { s: resp.status, d: dados };
}

const ctx = {};

function escolher(tipo) {
  const ids = [];
  for (const cat of tipo.categorias) {
    const qtd = Math.min(cat.maximo, Math.max(cat.minimo, 1));
    ids.push(...cat.opcoes.slice(0, qtd).map((o) => o.id));
  }
  return ids;
}

function pedidoBase(extra = {}) {
  return {
    nome: "Cliente Teste", telefone: "(53) 99999-9999", tipo_entrega: "retirada", forma_pagamento: "pix",
    itens: [
      { tipo_id: ctx.tipo.id, ingredientes: escolher(ctx.tipo), quantidade: 1, observacoes: "sem sal" },
      { extra_id: ctx.extra.id, quantidade: 2 },
    ],
    ...extra,
  };
}

test.before(async () => {
  const g = await chamar("POST", "/gestao/login", GERENTE);
  assert.equal(g.s, 200, "login do gerente falhou: rode npm run banco:reset na api");
  ctx.gt = g.d.token;
  const c = await chamar("POST", "/acesso/cadastro", { nome: "Cliente Teste", email: `t${unico}@teste.com`, senha: "123456", telefone: "(53) 99999-9999" });
  assert.equal(c.s, 201);
  ctx.ct = c.d.token;
  const cardapio = (await chamar("GET", "/cardapio")).d;
  assert.ok(cardapio.publicado, "o cardápio de hoje precisa estar publicado");
  ctx.cardapio = cardapio;
  ctx.tipo = cardapio.tipos[0];
  ctx.extra = cardapio.extras[0];
});

test("saúde e funcionamento", async () => {
  assert.equal((await chamar("GET", "/saude")).s, 200);
  const f = await chamar("GET", "/funcionamento");
  assert.equal(f.s, 200);
  assert.equal(typeof f.d.aberto, "boolean");
});

test("rotas protegidas exigem login", async () => {
  assert.equal((await chamar("GET", "/pedidos")).s, 401);
  assert.equal((await chamar("GET", "/gestao/pedidos")).s, 401);
  assert.equal((await chamar("GET", "/gestao/pedidos", undefined, ctx.ct)).s, 401);
});

test("cadastro valida dados e e-mail repetido", async () => {
  assert.equal((await chamar("POST", "/acesso/cadastro", { nome: "X", email: "a", senha: "1" })).s, 400);
  const r = await chamar("POST", "/acesso/cadastro", { nome: "Cliente Teste", email: `t${unico}@teste.com`, senha: "123456", telefone: "(53) 99999-9999" });
  assert.equal(r.s, 409);
});

test("cotação soma marmita e extras", async () => {
  const p = pedidoBase();
  const r = await chamar("POST", "/carrinho/cotacao", { itens: p.itens, tipo_entrega: "retirada" }, ctx.ct);
  assert.equal(r.s, 200);
  const esperado = ctx.tipo.preco + 2 * ctx.extra.preco;
  assert.ok(Math.abs(r.d.subtotal - esperado) < 0.01 + r.d.adicionais);
  assert.equal(r.d.taxa_entrega || 0, 0);
});

test("pedido: entrega só aceita pix ou cartão", async () => {
  const r = await chamar("POST", "/pedidos", pedidoBase({ tipo_entrega: "entrega", forma_pagamento: "dinheiro", bairro_id: ctx.cardapio.bairros[0].id, endereco: { rua: "A", numero: "1" } }), ctx.ct);
  assert.equal(r.s, 400);
});

test("pedido: cria, repete, aceita, avança e encerra", async () => {
  const novo = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  assert.equal(novo.s, 201);
  assert.equal(novo.d.status, "Esperando");
  const id = novo.d.id;

  const rep = await chamar("GET", `/pedidos/${id}/repetir`, undefined, ctx.ct);
  assert.equal(rep.s, 200);
  assert.equal(rep.d.itens.length, 2);
  assert.equal(rep.d.indisponiveis.length, 0);
  assert.ok(rep.d.itens.some((i) => i.extra_id === ctx.extra.id && i.quantidade === 2));

  assert.equal((await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Preparando" }, ctx.gt)).s, 409);
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/aceitar`, {}, ctx.gt)).s, 200);
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/aceitar`, {}, ctx.gt)).s, 409);
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/recusar`, { motivo: "Sem estoque" }, ctx.gt)).s, 409);

  assert.equal((await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Saiu para Entrega" }, ctx.gt)).s, 409);
  const pronto = await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Pronto para Retirada" }, ctx.gt);
  assert.equal(pronto.s, 200);
  const fim = await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Concluído" }, ctx.gt);
  assert.equal(fim.s, 200);
  assert.equal(fim.d.status_rotulo, "Retirado");
  assert.equal((await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Preparando" }, ctx.gt)).s, 409);
});

test("pedido: recusa com motivo avisa o cliente pelo chat", async () => {
  const novo = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  const id = novo.d.id;
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/recusar`, { motivo: "Sem estoque hoje" }, ctx.gt)).s, 200);
  const ped = await chamar("GET", `/pedidos/${id}`, undefined, ctx.ct);
  assert.equal(ped.d.status, "Cancelado");
  assert.equal(ped.d.status_rotulo, "Recusado");
  assert.equal(ped.d.motivo_recusa, "Sem estoque hoje");
  const msgs = await chamar("GET", `/pedidos/${id}/mensagens`, undefined, ctx.ct);
  assert.ok(msgs.d.some((m) => m.autor === "equipe" && m.texto === "Sem estoque hoje"));
});

test("chat cliente e equipe", async () => {
  const novo = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  const id = novo.d.id;
  assert.equal((await chamar("POST", `/pedidos/${id}/mensagens`, { texto: "Oi" }, ctx.ct)).s, 201);
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/mensagens`, { texto: "Olá!" }, ctx.gt)).s, 201);
  const lista = await chamar("GET", `/pedidos/${id}/mensagens`, undefined, ctx.ct);
  assert.deepEqual(lista.d.map((m) => m.autor), ["cliente", "equipe"]);
});

test("cliente não vê pedido de outro", async () => {
  const novo = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  const outro = await chamar("POST", "/acesso/cadastro", { nome: "Outro Cliente", email: `o${unico}@teste.com`, senha: "123456", telefone: "(53) 98888-7777" });
  assert.equal((await chamar("GET", `/pedidos/${novo.d.id}`, undefined, outro.d.token)).s, 404);
});

test("excluir item em uso pede confirmação", async () => {
  const tipo = await chamar("DELETE", `/gestao/tipos/${ctx.tipo.id}`, undefined, ctx.gt);
  assert.equal(tipo.s, 409);
  assert.equal(tipo.d.confirmar, true);
  const prod = await chamar("DELETE", `/gestao/produtos/${ctx.extra.id}`, undefined, ctx.gt);
  assert.equal(prod.s, 409);
  assert.equal(prod.d.confirmar, true);
});

test("excluir bairro com pedido em andamento pede confirmação e aceita forcar", async () => {
  const b = await chamar("POST", "/gestao/bairros", { nome: "Bairro Teste " + unico, taxa_entrega: 3 }, ctx.gt);
  assert.equal(b.s, 201);
  const ped = await chamar("POST", "/pedidos", pedidoBase({ tipo_entrega: "entrega", bairro_id: b.d.id, endereco: { rua: "Rua A", numero: "10" } }), ctx.ct);
  assert.equal(ped.s, 201);
  const sem = await chamar("DELETE", `/gestao/bairros/${b.d.id}`, undefined, ctx.gt);
  assert.equal(sem.s, 409);
  assert.equal(sem.d.confirmar, true);
  assert.equal((await chamar("DELETE", `/gestao/bairros/${b.d.id}?forcar=1`, undefined, ctx.gt)).s, 204);
});

test("loja: dados públicos e edição pelo gerente", async () => {
  const antes = (await chamar("GET", "/loja")).d;
  assert.ok(antes.nome && antes.endereco && antes.funcionamento);
  const dados = { nome: antes.nome, endereco: antes.endereco, telefone: antes.telefone, prazo_entrega: "40–50 min", prazo_retirada: antes.prazo_retirada, horario: "1-5 10:00-14:00" };
  assert.equal((await chamar("PUT", "/gestao/loja", dados, ctx.ct)).s, 401);
  assert.equal((await chamar("PUT", "/gestao/loja", { ...dados, horario: "5-1 10:00-14:00" }, ctx.gt)).s, 400);
  assert.equal((await chamar("PUT", "/gestao/loja", { ...dados, horario: "1-5 14:00-10:00" }, ctx.gt)).s, 400);
  const salvo = await chamar("PUT", "/gestao/loja", dados, ctx.gt);
  assert.equal(salvo.s, 200);
  assert.equal(salvo.d.prazo_entrega, "40–50 min");
  assert.equal((await chamar("GET", "/loja")).d.prazo_entrega, "40–50 min");
  await chamar("PUT", "/gestao/loja", { ...dados, prazo_entrega: antes.prazo_entrega, horario: antes.horario }, ctx.gt);
});

test("cliente cancela pedido aguardando aceite, mas não depois do aceite", async () => {
  const a = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  const cancel = await chamar("POST", `/pedidos/${a.d.id}/cancelar`, {}, ctx.ct);
  assert.equal(cancel.s, 200);
  assert.equal(cancel.d.status, "Cancelado");
  assert.equal(cancel.d.status_rotulo, "Cancelado");
  assert.equal((await chamar("POST", `/gestao/pedidos/${a.d.id}/aceitar`, {}, ctx.gt)).s, 409);
  assert.equal((await chamar("POST", `/pedidos/${a.d.id}/cancelar`, {}, ctx.ct)).s, 409);

  const b = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  await chamar("POST", `/gestao/pedidos/${b.d.id}/aceitar`, {}, ctx.gt);
  assert.equal((await chamar("POST", `/pedidos/${b.d.id}/cancelar`, {}, ctx.ct)).s, 409);
  const outro = await chamar("POST", "/acesso/cadastro", { nome: "Terceiro Cliente", email: `c${unico}@teste.com`, senha: "123456", telefone: "(53) 97777-6666" });
  assert.equal((await chamar("POST", `/pedidos/${b.d.id}/cancelar`, {}, outro.d.token)).s, 404);
});

test("listas aceitam limite e o gerente vê a contagem por status", async () => {
  const cliente = await chamar("GET", "/pedidos?limite=2", undefined, ctx.ct);
  assert.equal(cliente.d.length, 2);
  const gerente = await chamar("GET", "/gestao/pedidos?limite=3", undefined, ctx.gt);
  assert.ok(gerente.d.length <= 3);
  const c = await chamar("GET", "/gestao/pedidos/contagem", undefined, ctx.gt);
  assert.equal(c.s, 200);
  assert.ok(c.d.total >= 1 && typeof c.d.Esperando === "number");
});

test("métricas por semana, quinzena e mês", async () => {
  for (const periodo of ["semana", "quinzena", "mes"]) {
    const r = await chamar("GET", `/gestao/metricas?periodo=${periodo}`, undefined, ctx.gt);
    assert.equal(r.s, 200);
    const { serie, resumo, media, recorrencia } = r.d;
    assert.ok(serie.length >= 1);
    const atual = serie[serie.length - 1];
    assert.equal(resumo.atual.pedidos, atual.pedidos);
    assert.ok(atual.pedidos >= 1);
    assert.ok(atual.clientes_ativos >= 1 && atual.clientes_novos >= 1);
    assert.ok(Math.abs(atual.ticket_medio - atual.faturamento / atual.pedidos) < 0.01);
    assert.ok(media.faturamento > 0);
    assert.ok(recorrencia.clientes_recorrentes >= 1);
    assert.equal(recorrencia.faixas.length, 4);
  }
  assert.equal((await chamar("GET", "/gestao/metricas?periodo=ano", undefined, ctx.gt)).s, 400);
  assert.equal((await chamar("GET", "/gestao/metricas", undefined, ctx.ct)).s, 401);
});

test("recuperar senha por link", async () => {
  const email = `r${unico}@teste.com`;
  await chamar("POST", "/acesso/cadastro", { nome: "Recupera Senha", email, senha: "123456", telefone: "(53) 96666-5555" });
  const desconhecido = await chamar("POST", "/acesso/esqueci", { email: `nao${unico}@teste.com` });
  assert.equal(desconhecido.s, 200);
  assert.equal(desconhecido.d.link, undefined);
  const r = await chamar("POST", "/acesso/esqueci", { email });
  assert.equal(r.s, 200);
  if (!r.d.link) return;
  const token = new URL(r.d.link.replace("/#/", "/")).searchParams.get("token");
  assert.equal((await chamar("POST", "/acesso/redefinir", { token: "errado", senha: "novasenha" })).s, 400);
  assert.equal((await chamar("POST", "/acesso/redefinir", { token, senha: "123" })).s, 400);
  assert.equal((await chamar("POST", "/acesso/redefinir", { token, senha: "novasenha" })).s, 200);
  assert.equal((await chamar("POST", "/acesso/redefinir", { token, senha: "outrasenha" })).s, 400);
  assert.equal((await chamar("POST", "/acesso/login", { email, senha: "123456" })).s, 401);
  assert.equal((await chamar("POST", "/acesso/login", { email, senha: "novasenha" })).s, 200);
});

async function ouvir(caminho, token) {
  const controle = new AbortController();
  const resp = await fetch(BASE + caminho, { headers: { Authorization: "Bearer " + token }, signal: controle.signal });
  assert.equal(resp.status, 200);
  assert.match(resp.headers.get("content-type"), /text\/event-stream/);
  const leitor = resp.body.getReader();
  const decoder = new TextDecoder();
  let texto = "";
  const esperar = async (padrao, ms = 4000) => {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      if (padrao.test(texto)) return texto;
      const pedaco = await Promise.race([leitor.read(), new Promise((ok) => setTimeout(() => ok(null), 300))]);
      if (pedaco && pedaco.value) texto += decoder.decode(pedaco.value);
    }
    return texto;
  };
  return { esperar, fechar: () => controle.abort() };
}

test("tempo real: gerente e cliente recebem eventos", async () => {
  const gerente = await ouvir("/gestao/eventos", ctx.gt);
  const cliente = await ouvir("/pedidos/eventos", ctx.ct);
  const novo = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  assert.match(await gerente.esperar(/"tipo":"novo"/), new RegExp(`"tipo":"novo","id":${novo.d.id}`));
  await chamar("POST", `/gestao/pedidos/${novo.d.id}/aceitar`, {}, ctx.gt);
  assert.match(await cliente.esperar(/"tipo":"pedido"/), new RegExp(`"tipo":"pedido","id":${novo.d.id}`));
  await chamar("POST", `/pedidos/${novo.d.id}/mensagens`, { texto: "oi" }, ctx.ct);
  assert.match(await gerente.esperar(/"tipo":"mensagem"/), /"tipo":"mensagem"/);
  gerente.fechar();
  cliente.fechar();
  const sem = await fetch(BASE + "/gestao/eventos");
  assert.equal(sem.status, 401);
});

test("limite de tentativas de login", async () => {
  const email = `ninguem${unico}@teste.com`;
  const codigos = [];
  for (let i = 0; i < 10; i++) codigos.push((await chamar("POST", "/acesso/login", { email, senha: "errada1" })).s);
  assert.deepEqual(codigos.slice(0, 8), Array(8).fill(401));
  assert.equal(codigos[9], 429);
  const g = [];
  for (let i = 0; i < 9; i++) g.push((await chamar("POST", "/gestao/login", { email: `x${unico}@teste.com`, senha: "errada1" })).s);
  assert.equal(g[8], 429);
});
