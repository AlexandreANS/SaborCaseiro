const test = require("node:test");
const http = require("node:http");
const crypto = require("node:crypto");
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
  try {
    dados = await resp.json();
  } catch {}
  return { s: resp.status, d: dados };
}

const ctx = {};

const CEPS = {
  "01310100": { logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" },
  "01310200": { logradouro: "Alameda Santos", bairro: "BELA  vista", localidade: "São Paulo", uf: "SP" },
  99999000: { logradouro: "Rua Distante", bairro: "Lugar Distante", localidade: "Outra", uf: "XX" },
  99999001: { logradouro: "", bairro: "", localidade: "Outra", uf: "XX" },
};
const PORTA_CEP = Number(process.env.CEP_FALSO_PORTA || 5599);
const servidorCep = http.createServer((req, res) => {
  const achado = CEPS[(req.url.match(/\/(\d{8})\/json/) || [])[1]];
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(achado || { erro: true }));
});
test.before(() => new Promise((ok) => servidorCep.listen(PORTA_CEP, ok)));
test.after(() => servidorCep.close());

const BELA = "01310-100";
const temCepFalso = async () => (await chamar("GET", "/cep/" + BELA)).s === 200;

function escolher(tipo) {
  const ids = [];
  for (const cat of tipo.categorias) ids.push(...cat.opcoes.slice(0, cat.minimo).map((o) => o.id));
  return ids;
}

function categoriaComFolga(tipo) {
  return tipo.categorias.find((c) => c.maximo > c.minimo && c.opcoes.length > c.minimo);
}

function pedidoBase(extra = {}) {
  return {
    nome: "Cliente Teste",
    telefone: "(53) 99999-9999",
    tipo_entrega: "retirada",
    forma_pagamento: "pix",
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
  const c = await chamar("POST", "/acesso/cadastro", {
    nome: "Cliente Teste",
    email: `t${unico}@teste.com`,
    senha: "123456",
    telefone: "(53) 99999-9999",
  });
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
  const r = await chamar("POST", "/acesso/cadastro", {
    nome: "Cliente Teste",
    email: `t${unico}@teste.com`,
    senha: "123456",
    telefone: "(53) 99999-9999",
  });
  assert.equal(r.s, 409);
});

test("cotação soma marmita e extras", async () => {
  const p = pedidoBase();
  const r = await chamar("POST", "/carrinho/cotacao", { itens: p.itens, tipo_entrega: "retirada" }, ctx.ct);
  assert.equal(r.s, 200);
  const esperado = ctx.tipo.preco + 2 * ctx.extra.preco;
  assert.ok(Math.abs(r.d.subtotal - esperado) < 0.01);
  assert.equal(r.d.adicionais, 0);
  assert.equal(r.d.taxa_entrega || 0, 0);
});

test("ingrediente principal não é cobrado, só o adicional", async () => {
  const cat = categoriaComFolga(ctx.tipo);
  assert.ok(cat, "o tipo precisa ter uma categoria com folga");
  const base = escolher(ctx.tipo);
  const troca = cat.opcoes[cat.minimo];
  const semTroca = base.filter((id) => !cat.opcoes.slice(0, cat.minimo).some((o) => o.id === id));
  const principais = [...semTroca, ...cat.opcoes.slice(1, cat.minimo).map((o) => o.id), troca.id];
  const trocado = await chamar(
    "POST",
    "/carrinho/cotacao",
    { itens: [{ tipo_id: ctx.tipo.id, ingredientes: principais, quantidade: 1 }], tipo_entrega: "retirada" },
    ctx.ct
  );
  assert.equal(trocado.s, 200);
  assert.ok(Math.abs(trocado.d.subtotal - ctx.tipo.preco) < 0.01);
  assert.equal(trocado.d.adicionais, 0);

  const comExtra = await chamar(
    "POST",
    "/carrinho/cotacao",
    { itens: [{ tipo_id: ctx.tipo.id, ingredientes: principais, adicionais: [troca.id], quantidade: 2 }], tipo_entrega: "retirada" },
    ctx.ct
  );
  assert.equal(comExtra.s, 200);
  assert.ok(Math.abs(comExtra.d.adicionais - 2 * troca.preco_extra) < 0.01);
  assert.ok(Math.abs(comExtra.d.subtotal - 2 * ctx.tipo.preco) < 0.01);
});

test("mais de um adicional soma cada um, inclusive repetido", async () => {
  const cat = ctx.tipo.categorias.find((c) => c.maximo - c.minimo >= 2 && c.opcoes.length >= 2);
  assert.ok(cat, "o tipo precisa aceitar ao menos 2 adicionais em alguma categoria");
  const [x, y] = cat.opcoes;
  const r = await chamar(
    "POST",
    "/carrinho/cotacao",
    {
      itens: [{ tipo_id: ctx.tipo.id, ingredientes: escolher(ctx.tipo), adicionais: [x.id, y.id, x.id], quantidade: 1 }],
      tipo_entrega: "retirada",
    },
    ctx.ct
  );
  assert.equal(r.s, 200);
  assert.ok(Math.abs(r.d.adicionais - (2 * x.preco_extra + y.preco_extra)) < 0.01);
});

test("cotação recusa adicional acima do limite e principais fora do mínimo", async () => {
  const cat = categoriaComFolga(ctx.tipo);
  const base = escolher(ctx.tipo);
  const extras = Array(cat.maximo - cat.minimo + 1).fill(cat.opcoes[0].id);
  const passou = await chamar(
    "POST",
    "/carrinho/cotacao",
    { itens: [{ tipo_id: ctx.tipo.id, ingredientes: base, adicionais: extras, quantidade: 1 }], tipo_entrega: "retirada" },
    ctx.ct
  );
  assert.equal(passou.s, 400);

  const faltando = base.filter((id) => id !== cat.opcoes[0].id);
  const menos = await chamar(
    "POST",
    "/carrinho/cotacao",
    { itens: [{ tipo_id: ctx.tipo.id, ingredientes: faltando, quantidade: 1 }], tipo_entrega: "retirada" },
    ctx.ct
  );
  assert.equal(menos.s, 400);

  const mais = await chamar(
    "POST",
    "/carrinho/cotacao",
    { itens: [{ tipo_id: ctx.tipo.id, ingredientes: [...base, cat.opcoes[cat.minimo].id], quantidade: 1 }], tipo_entrega: "retirada" },
    ctx.ct
  );
  assert.equal(mais.s, 400);
});

test("pedido: entrega só aceita pix ou cartão", async () => {
  const r = await chamar(
    "POST",
    "/pedidos",
    pedidoBase({ tipo_entrega: "entrega", forma_pagamento: "dinheiro", endereco: { cep: BELA, rua: "A", numero: "1" } }),
    ctx.ct
  );
  assert.equal(r.s, 400);
});

test("pedido: cria, repete, aceita, avança e encerra", async () => {
  const novo = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  assert.equal(novo.s, 201);
  assert.equal(novo.d.status, "Esperando");
  const id = novo.d.id;
  assert.equal(novo.d.proxima.status, "Preparando");
  assert.equal(novo.d.anterior, null);

  const rep = await chamar("GET", `/pedidos/${id}/repetir`, undefined, ctx.ct);
  assert.equal(rep.s, 200);
  assert.equal(rep.d.itens.length, 2);
  assert.equal(rep.d.indisponiveis.length, 0);
  assert.ok(rep.d.itens.some((i) => i.extra_id === ctx.extra.id && i.quantidade === 2));
  const marmita = rep.d.itens.find((i) => i.tipo_id);
  assert.ok(Array.isArray(marmita.adicionais));

  assert.equal((await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Preparando" }, ctx.gt)).s, 409);
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/aceitar`, {}, ctx.gt)).s, 200);
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/aceitar`, {}, ctx.gt)).s, 409);
  assert.equal((await chamar("POST", `/gestao/pedidos/${id}/recusar`, { motivo: "Sem estoque" }, ctx.gt)).s, 409);

  assert.equal((await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Saiu para Entrega" }, ctx.gt)).s, 409);
  const pronto = await chamar("PUT", `/gestao/pedidos/${id}/status`, { status: "Pronto para Retirada" }, ctx.gt);
  assert.equal(pronto.s, 200);
  assert.equal(pronto.d.proxima.status, "Concluído");
  assert.equal(pronto.d.anterior.status, "Preparando");
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
  assert.deepEqual(
    lista.d.map((m) => m.autor),
    ["cliente", "equipe"]
  );
});

test("cliente não vê pedido de outro", async () => {
  const novo = await chamar("POST", "/pedidos", pedidoBase(), ctx.ct);
  const outro = await chamar("POST", "/acesso/cadastro", {
    nome: "Outro Cliente",
    email: `o${unico}@teste.com`,
    senha: "123456",
    telefone: "(53) 98888-7777",
  });
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

test("excluir bairro com pedido em andamento pede confirmação e aceita forcar", async (t) => {
  if (!(await temCepFalso())) return t.skip("API sem SABOR_CEP_URL de teste");
  const b = await chamar("POST", "/gestao/bairros", { nome: "Bairro Teste " + unico, taxa_entrega: 3 }, ctx.gt);
  assert.equal(b.s, 201);
  CEPS["88888001"] = { logradouro: "Rua A", bairro: "Bairro Teste " + unico, localidade: "São Paulo", uf: "SP" };
  const ped = await chamar(
    "POST",
    "/pedidos",
    pedidoBase({ tipo_entrega: "entrega", endereco: { cep: "88888-001", rua: "Rua A", numero: "10" } }),
    ctx.ct
  );
  assert.equal(ped.s, 201);
  assert.equal(ped.d.bairro_nome, "Bairro Teste " + unico);
  const sem = await chamar("DELETE", `/gestao/bairros/${b.d.id}`, undefined, ctx.gt);
  assert.equal(sem.s, 409);
  assert.equal(sem.d.confirmar, true);
  assert.equal((await chamar("DELETE", `/gestao/bairros/${b.d.id}?forcar=1`, undefined, ctx.gt)).s, 204);
});

test("CEP: acha o bairro no banco e devolve a taxa", async (t) => {
  if (!(await temCepFalso())) return t.skip("suba a API com SABOR_CEP_URL=http://localhost:5599/ws para testar o CEP");
  const r = await chamar("GET", "/cep/01310-100");
  assert.equal(r.s, 200);
  assert.equal(r.d.cep, "01310-100");
  assert.equal(r.d.rua, "Avenida Paulista");
  const bela = ctx.cardapio.bairros.find((b) => b.nome === "Bela Vista");
  assert.equal(r.d.bairro.id, bela.id);
  assert.equal(r.d.bairro.taxa_entrega, bela.taxa_entrega);
  const parecido = await chamar("GET", "/cep/01310200");
  assert.equal(parecido.s, 200);
  assert.equal(parecido.d.bairro.id, bela.id);
});

test("CEP: inválido, inexistente, sem bairro e bairro não atendido dão erro", async (t) => {
  if (!(await temCepFalso())) return t.skip("API sem SABOR_CEP_URL de teste");
  assert.equal((await chamar("GET", "/cep/123")).s, 400);
  assert.equal((await chamar("GET", "/cep/00000000")).s, 404);
  const semBairro = await chamar("GET", "/cep/99999001");
  assert.equal(semBairro.s, 422);
  const longe = await chamar("GET", "/cep/99999000");
  assert.equal(longe.s, 422);
  assert.match(longe.d.erro, /Lugar Distante/);
});

test("cotação e pedido de entrega usam o bairro do CEP e recusam bairro não atendido", async (t) => {
  if (!(await temCepFalso())) return t.skip("API sem SABOR_CEP_URL de teste");
  const bela = ctx.cardapio.bairros.find((b) => b.nome === "Bela Vista");
  const itens = pedidoBase().itens;
  const ok = await chamar("POST", "/carrinho/cotacao", { itens, tipo_entrega: "entrega", cep: BELA }, ctx.ct);
  assert.equal(ok.s, 200);
  assert.equal(ok.d.taxa_entrega, bela.taxa_entrega);
  assert.equal(ok.d.bairro.nome, "Bela Vista");
  const sem = await chamar("POST", "/carrinho/cotacao", { itens, tipo_entrega: "entrega" }, ctx.ct);
  assert.equal(sem.d.taxa_entrega, null);
  const longe = await chamar("POST", "/carrinho/cotacao", { itens, tipo_entrega: "entrega", cep: "99999-000" }, ctx.ct);
  assert.equal(longe.s, 422);
  const semCep = await chamar("POST", "/pedidos", pedidoBase({ tipo_entrega: "entrega", endereco: { rua: "A", numero: "1" } }), ctx.ct);
  assert.equal(semCep.s, 400);
  const pedLonge = await chamar(
    "POST",
    "/pedidos",
    pedidoBase({ tipo_entrega: "entrega", endereco: { cep: "99999-000", rua: "A", numero: "1" } }),
    ctx.ct
  );
  assert.equal(pedLonge.s, 422);
  const forjado = await chamar(
    "POST",
    "/pedidos",
    pedidoBase({ tipo_entrega: "entrega", bairro_id: ctx.cardapio.bairros[0].id, endereco: { cep: "99999-000", rua: "A", numero: "1" } }),
    ctx.ct
  );
  assert.equal(forjado.s, 422);
  const bom = await chamar(
    "POST",
    "/pedidos",
    pedidoBase({ tipo_entrega: "entrega", endereco: { cep: BELA, rua: "Av. Paulista", numero: "1000" } }),
    ctx.ct
  );
  assert.equal(bom.s, 201);
  assert.equal(bom.d.bairro_nome, "Bela Vista");
  assert.equal(bom.d.cep, "01310-100");
  assert.ok(Math.abs(bom.d.taxa_entrega - bela.taxa_entrega) < 0.01);
});

test("pedido: mesma chave de envio não duplica o pedido", async () => {
  const chave = "chave-" + unico + "-a";
  const primeiro = await chamar("POST", "/pedidos", pedidoBase({ chave_envio: chave }), ctx.ct);
  assert.equal(primeiro.s, 201);
  const segundo = await chamar("POST", "/pedidos", pedidoBase({ chave_envio: chave }), ctx.ct);
  assert.equal(segundo.s, 200);
  assert.equal(segundo.d.id, primeiro.d.id);
  const simultaneos = await Promise.all([1, 2, 3].map(() => chamar("POST", "/pedidos", pedidoBase({ chave_envio: chave + "-b" }), ctx.ct)));
  assert.equal(new Set(simultaneos.map((r) => r.d.id)).size, 1);
  assert.equal(simultaneos.filter((r) => r.s === 201).length, 1);
  const outro = await chamar("POST", "/pedidos", pedidoBase({ chave_envio: chave + "-c" }), ctx.ct);
  assert.notEqual(outro.d.id, primeiro.d.id);
});

test("conta: salva e apaga o endereço pelo CEP", async (t) => {
  if (!(await temCepFalso())) return t.skip("API sem SABOR_CEP_URL de teste");
  const bela = ctx.cardapio.bairros.find((b) => b.nome === "Bela Vista");
  assert.equal((await chamar("PUT", "/acesso/eu/endereco", { cep: BELA, rua: "Av. Paulista", numero: "5" })).s, 401);
  const ok = await chamar("PUT", "/acesso/eu/endereco", { cep: BELA, rua: "Av. Paulista", numero: "5", complemento: "ap 2" }, ctx.ct);
  assert.equal(ok.s, 200);
  assert.equal(ok.d.endereco.cep, "01310-100");
  assert.equal(ok.d.endereco.bairro_id, bela.id);
  assert.equal((await chamar("PUT", "/acesso/eu/endereco", { cep: "99999-000", rua: "X", numero: "1" }, ctx.ct)).s, 422);
  assert.equal((await chamar("PUT", "/acesso/eu/endereco", { cep: BELA, rua: "", numero: "1" }, ctx.ct)).s, 400);
  const sem = await chamar("DELETE", "/acesso/eu/endereco", undefined, ctx.ct);
  assert.equal(sem.s, 200);
  assert.equal(sem.d.endereco, null);
});

test("CORS: só origens permitidas leem a resposta da API", async () => {
  const chamarCom = (origem, metodo = "GET") => fetch(BASE + "/loja", { method: metodo, headers: origem ? { Origin: origem } : {} });
  const local = await chamarCom("http://localhost:5500");
  assert.equal(local.headers.get("access-control-allow-origin"), "http://localhost:5500");
  const estranha = await chamarCom("https://site-malicioso.example.com");
  assert.equal(estranha.headers.get("access-control-allow-origin"), null);
  const semOrigem = await chamarCom(null);
  assert.equal(semOrigem.status, 200);
  const preVoo = await fetch(BASE + "/pedidos", {
    method: "OPTIONS",
    headers: {
      Origin: "https://site-malicioso.example.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(preVoo.headers.get("access-control-allow-origin"), null);
});

test("rotas do gerente aceitam requisição sem corpo sem dar erro 500", async () => {
  const sem = await chamar("PUT", "/gestao/pedidos/1/status", undefined, ctx.gt);
  assert.ok([400, 404, 409].includes(sem.s), "status " + sem.s);
  const recusa = await chamar("POST", "/gestao/pedidos/1/recusar", undefined, ctx.gt);
  assert.ok([400, 404, 409].includes(recusa.s), "status " + recusa.s);
});

test("sessão: trocar a senha encerra os logins antigos e devolve um novo", async () => {
  const email = `sessao${unico}@teste.com`;
  const cad = await chamar("POST", "/acesso/cadastro", { nome: "Sessao Teste", email, telefone: "(53) 99999-9999", senha: "123456" });
  assert.equal(cad.s, 201);
  const antigo = cad.d.token;
  assert.equal((await chamar("GET", "/acesso/eu", undefined, antigo)).s, 200);
  const troca = await chamar(
    "PUT",
    "/acesso/eu",
    { nome: "Sessao Teste", email, telefone: "(53) 99999-9999", senha_atual: "123456", nova_senha: "654321" },
    antigo
  );
  assert.equal(troca.s, 200);
  assert.ok(troca.d.token);
  assert.equal((await chamar("GET", "/acesso/eu", undefined, antigo)).s, 401);
  assert.equal((await chamar("GET", "/acesso/eu", undefined, troca.d.token)).s, 200);
  const entrou = await chamar("POST", "/acesso/login", { email, senha: "654321" });
  assert.equal(entrou.s, 200);
  assert.equal((await chamar("GET", "/pedidos", undefined, entrou.d.token)).s, 200);
});

test("sessão: conta apagada perde o acesso na hora e senha enorme é recusada", async () => {
  const email = `apagada${unico}@teste.com`;
  const cad = await chamar("POST", "/acesso/cadastro", { nome: "Apagada Teste", email, telefone: "(53) 99999-9999", senha: "123456" });
  const ped = await chamar("POST", "/pedidos", pedidoBase(), cad.d.token);
  assert.equal(ped.s, 201);
  assert.equal((await chamar("DELETE", "/acesso/eu", { senha: "123456" }, cad.d.token)).s, 200);
  assert.equal((await chamar("POST", "/pedidos", pedidoBase(), cad.d.token)).s, 401);
  assert.equal((await chamar("GET", "/pedidos", undefined, cad.d.token)).s, 401);
  const longa = await chamar("POST", "/acesso/cadastro", {
    nome: "Longa Teste",
    email: `longa${unico}@teste.com`,
    telefone: "(53) 99999-9999",
    senha: "a".repeat(200),
  });
  assert.equal(longa.s, 400);
});

test("senha atual: tentativas erradas na troca de senha são limitadas", async () => {
  const email = `limite${unico}@teste.com`;
  const cad = await chamar("POST", "/acesso/cadastro", { nome: "Limite Teste", email, telefone: "(53) 99999-9999", senha: "123456" });
  const tentativa = (atual) =>
    chamar(
      "PUT",
      "/acesso/eu",
      { nome: "Limite Teste", email, telefone: "(53) 99999-9999", senha_atual: atual, nova_senha: "abcdef" },
      cad.d.token
    );
  for (let i = 0; i < 5; i++) assert.equal((await tentativa("errada")).s, 401);
  assert.equal((await tentativa("errada")).s, 429);
  assert.equal((await tentativa("123456")).s, 429);
  const dados = await chamar("PUT", "/acesso/eu", { nome: "Limite Novo", email, telefone: "(53) 99999-9999" }, cad.d.token);
  assert.equal(dados.s, 200);
});

test("sessão: token com mais de um dia é renovado no cabeçalho", async () => {
  const email = `renova${unico}@teste.com`;
  const cad = await chamar("POST", "/acesso/cadastro", { nome: "Renova Teste", email, telefone: "(53) 99999-9999", senha: "123456" });
  const recente = await fetch(BASE + "/acesso/eu", { headers: { Authorization: "Bearer " + cad.d.token } });
  assert.equal(recente.headers.get("x-token-renovado"), null);
  const [corpo] = cad.d.token.split(".");
  const dados = JSON.parse(Buffer.from(corpo, "base64url").toString());
  assert.ok(dados.iat && dados.exp - dados.iat <= 7 * 86400000);
  const antigo = { ...dados, iat: Date.now() - 2 * 86400000 };
  const novoCorpo = Buffer.from(JSON.stringify(antigo)).toString("base64url");
  const segredo = process.env.SABOR_SECRET || "troque-este-segredo-em-producao";
  const assinatura = crypto.createHmac("sha256", segredo).update(novoCorpo).digest("base64url");
  const velho = await fetch(BASE + "/acesso/eu", { headers: { Authorization: `Bearer ${novoCorpo}.${assinatura}` } });
  assert.equal(velho.status, 200);
  const renovado = velho.headers.get("x-token-renovado");
  assert.ok(renovado);
  assert.equal((await chamar("GET", "/acesso/eu", undefined, renovado)).s, 200);
});

test("cardápio: copiar o último cardápio para outro dia", async () => {
  const amanha = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  assert.equal((await chamar("POST", `/gestao/cardapio-dia/${amanha}/copiar`, {})).s, 401);
  const r = await chamar("POST", `/gestao/cardapio-dia/${amanha}/copiar`, {}, ctx.gt);
  assert.equal(r.s, 200);
  assert.ok(r.d.tipo_ids.length > 0 && r.d.produto_ids.length > 0);
  assert.equal(r.d.publicado, false);
  assert.ok(r.d.copiado_de < amanha);
  const ruim = await chamar("POST", "/gestao/cardapio-dia/2000-01-01/copiar", {}, ctx.gt);
  assert.equal(ruim.s, 404);
});

test("loja: dados públicos e edição pelo gerente", async () => {
  const antes = (await chamar("GET", "/loja")).d;
  assert.ok(antes.nome && antes.endereco && antes.funcionamento);
  const dados = {
    nome: antes.nome,
    endereco: antes.endereco,
    telefone: antes.telefone,
    prazo_entrega: "40–50 min",
    prazo_retirada: antes.prazo_retirada,
    horario: "1-5 10:00-14:00",
  };
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
  const outro = await chamar("POST", "/acesso/cadastro", {
    nome: "Terceiro Cliente",
    email: `c${unico}@teste.com`,
    senha: "123456",
    telefone: "(53) 97777-6666",
  });
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
