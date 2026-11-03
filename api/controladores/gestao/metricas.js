const Metrica = require("../../modelos/metrica");
const { ErroApi } = require("../../util/erros");

const PERIODOS = { semana: { dias: 7, max: 8 }, quinzena: { dias: 15, max: 6 }, mes: { dias: 30, max: 6 } };
const ROTULOS = { 1: "1 pedido", 2: "2 pedidos", 3: "3 pedidos", 4: "4 ou mais" };

const arredondar = (n) => Math.round(n * 100) / 100;
const variacao = (atual, anterior) => (anterior ? arredondar(((atual - anterior) / anterior) * 100) : null);
const porBloco = (linhas, campo) => new Map(linhas.map((l) => [Number(l.b), l[campo]]));

function somarDias(iso, dias) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function montarSerie({ hoje, dias, quantos, pedidos, recorrentes, novos }) {
  const mp = new Map(pedidos.map((l) => [Number(l.b), l]));
  const mr = porBloco(recorrentes, "n");
  const mn = porBloco(novos, "n");
  const serie = [];
  for (let b = quantos - 1; b >= 0; b--) {
    const l = mp.get(b) || { pedidos: 0, faturamento: 0, ativos: 0 };
    const fim = somarDias(hoje, -dias * b);
    serie.push({
      inicio: somarDias(fim, -(dias - 1)),
      fim,
      pedidos: l.pedidos,
      faturamento: arredondar(l.faturamento),
      ticket_medio: l.pedidos ? arredondar(l.faturamento / l.pedidos) : 0,
      clientes_ativos: l.ativos,
      clientes_novos: mn.get(b) || 0,
      clientes_recorrentes: mr.get(b) || 0,
    });
  }
  return serie;
}

function medias(serie) {
  const somaPed = serie.reduce((s, x) => s + x.pedidos, 0);
  const somaFat = serie.reduce((s, x) => s + x.faturamento, 0);
  const media = (campo) => arredondar(serie.reduce((s, x) => s + x[campo], 0) / serie.length);
  return {
    pedidos: arredondar(somaPed / serie.length),
    faturamento: arredondar(somaFat / serie.length),
    ticket_medio: somaPed ? arredondar(somaFat / somaPed) : 0,
    clientes_ativos: media("clientes_ativos"),
    clientes_novos: media("clientes_novos"),
  };
}

function recorrencia(linhas) {
  const faixas = [1, 2, 3, 4].map((f) => ({
    faixa: ROTULOS[f],
    clientes: (linhas.find((r) => r.faixa === f) || { clientes: 0 }).clientes,
  }));
  const compraram = faixas.reduce((s, f) => s + f.clientes, 0);
  const voltaram = faixas.slice(1).reduce((s, f) => s + f.clientes, 0);
  return {
    faixas,
    clientes_com_pedido: compraram,
    clientes_recorrentes: voltaram,
    taxa: compraram ? arredondar((voltaram / compraram) * 100) : 0,
  };
}

async function ver(req, res) {
  const periodo = req.query.periodo || "semana";
  const conf = PERIODOS[periodo];
  if (!conf) throw new ErroApi("Período inválido. Use semana, quinzena ou mes.");
  const { dias, max } = conf;

  const { hoje, desde_primeiro: desdePrimeiro } = await Metrica.base();
  const quantos = Math.min(max, Math.floor(desdePrimeiro / dias) + 1);
  const serie = montarSerie({
    hoje,
    dias,
    quantos,
    pedidos: await Metrica.pedidos(dias, quantos),
    recorrentes: await Metrica.recorrentes(dias, quantos),
    novos: await Metrica.novos(dias, quantos),
  });
  const atual = serie[serie.length - 1];
  const anterior = serie.length > 1 ? serie[serie.length - 2] : null;
  const top = await Metrica.maisFrequentes(dias * quantos);

  res.json({
    periodo,
    dias,
    hoje,
    hoje_resumo: await Metrica.doDia(),
    serie,
    media: medias(serie),
    resumo: {
      atual,
      anterior,
      variacao: anterior
        ? {
            pedidos: variacao(atual.pedidos, anterior.pedidos),
            faturamento: variacao(atual.faturamento, anterior.faturamento),
            ticket_medio: variacao(atual.ticket_medio, anterior.ticket_medio),
            clientes_ativos: variacao(atual.clientes_ativos, anterior.clientes_ativos),
          }
        : null,
    },
    recorrencia: recorrencia(await Metrica.frequencia()),
    mais_frequentes: top.map((t) => ({ ...t, total: arredondar(t.total) })),
  });
}

module.exports = { ver };
