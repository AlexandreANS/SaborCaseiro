Sabor.controle.checkout = {
  titulo: "Finalizar Pedido",
  ativa: "carrinho",
  exigeLogin: true,
  async montar(raiz, params) {
    const { achar, aviso } = Dom;
    const { carrinho, sessao } = Sabor;
    const { mostrarErro } = Sabor.visao.base;
    const visao = Sabor.visao.checkout;
    Sabor.visao.base.desenhar(raiz, visao.molde);
    if (!carrinho.itens().length) return Sabor.rota.ir("/montar", true);

    const form = achar("#form-checkout", raiz);
    const erro = achar("#form-erro", raiz);
    const campos = form.elements;
    const estado = { entrega: "entrega", horario: "asap", pagamento: "pix", cotacao: null, fechado: false };
    let local = { cep: "", buscando: false };
    let func = null;

    try {
      const cliente = await Sabor.api.eu();
      sessao.atualizarCliente(cliente);
      visao.preencherCliente(raiz, cliente);
    } catch (falha) {
      if (falha.status === 401) return Sabor.app.exigirLogin();
    }

    try {
      const [cardapio, loja] = await Promise.all([Sabor.api.cardapio(), Sabor.app.loja(true)]);
      func = loja ? loja.funcionamento : null;
      if (loja) visao.prazos(raiz, loja);
      const fora = carrinho.reconciliar(cardapio);
      if (fora.length) {
        aviso("Removidos do carrinho (fora do cardápio de hoje): " + fora.join(", ") + ".", "erro");
        if (!carrinho.itens().length) return Sabor.rota.ir("/carrinho", true);
      }
    } catch (falha) {
      mostrarErro(erro, falha.message);
    }

    function escolher(seletor, chave, valor) {
      estado[chave] = valor;
      visao.marcar(raiz, seletor, valor);
    }

    function grupo(seletor, chave, aoMudar) {
      achar(seletor, raiz)
        .querySelectorAll("[data-valor]")
        .forEach((el) => {
          const marcar = () => {
            escolher(seletor, chave, el.dataset.valor);
            if (aoMudar) aoMudar();
          };
          el.addEventListener("click", marcar);
          el.addEventListener("keydown", (ev) => {
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              marcar();
            }
          });
        });
    }

    function ajustarHorario() {
      if (!func || func.sempre) return;
      visao.limitesHorario(raiz, func);
      if (!func.dia_aberto || func.agora >= func.fecha) {
        estado.fechado = true;
        visao.avisoHorario(raiz, "Estamos fechados agora. Funcionamos " + func.texto + ".");
      } else if (func.agora < func.abre) {
        visao.esconderImediato(raiz);
        escolher("#grupo-horario", "horario", "agendar");
        visao.avisoHorario(raiz, "Ainda não abrimos. Agende um horário para hoje a partir das " + func.abre + ".");
      }
    }

    function atualizarTela() {
      if (estado.entrega === "entrega" && estado.pagamento === "dinheiro") escolher("#grupo-pagamento", "pagamento", "pix");
      visao.atualizar(raiz, estado);
    }

    async function cotar() {
      try {
        estado.cotacao = await Sabor.api.cotar(carrinho.paraApi(), {
          tipo_entrega: estado.entrega,
          cep: local.cep || undefined,
          cupom: carrinho.cupom(),
        });
        mostrarErro(erro, "");
      } catch (falha) {
        estado.cotacao = null;
        mostrarErro(erro, falha.message);
      }
      visao.resumo(raiz, estado);
    }

    function chaveEnvio(corpo) {
      const assinatura = JSON.stringify(corpo);
      const guardado = Sabor.armazem.lerJson("localStorage", "sabor.envio", null);
      if (guardado && guardado.assinatura === assinatura) return guardado.chave;
      const chave =
        window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      Sabor.armazem.gravar("localStorage", "sabor.envio", JSON.stringify({ chave, assinatura }));
      return chave;
    }

    function montarPedido() {
      const entrega = estado.entrega === "entrega";
      return {
        nome: campos.nome.value,
        telefone: campos.telefone.value,
        tipo_entrega: estado.entrega,
        endereco: entrega
          ? { cep: campos.cep.value, rua: campos.rua.value, numero: campos.numero.value, complemento: campos.complemento.value }
          : undefined,
        salvar_endereco: campos.salvar_endereco.checked,
        horario: estado.horario === "agendar" ? campos.horario_agendado.value : "asap",
        observacoes: campos.observacoes.value,
        forma_pagamento: estado.pagamento,
        troco_para: estado.pagamento === "dinheiro" && campos.troco_para.value ? Number(campos.troco_para.value) : undefined,
        cupom: carrinho.cupom() || undefined,
        itens: carrinho.paraApi(),
      };
    }

    grupo("#grupo-entrega", "entrega", () => {
      atualizarTela();
      cotar();
    });
    grupo("#grupo-horario", "horario", atualizarTela);
    grupo("#grupo-pagamento", "pagamento", atualizarTela);
    ajustarHorario();
    atualizarTela();
    visao.resumo(raiz, estado);
    local = Sabor.controle.cep.ligar({
      cep: campos.cep,
      rua: campos.rua,
      numero: campos.numero,
      dica: achar("#dica-cep", raiz),
      caixa: achar("#bairro-achado", raiz),
      aoMudar: () => cotar(),
    });
    if (!local.buscando) cotar();

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      visao.enviando(raiz);
      try {
        const corpo = montarPedido();
        const pedido = await Sabor.api.criarPedido({ ...corpo, chave_envio: chaveEnvio(corpo) });
        Sabor.armazem.gravar("localStorage", "sabor.envio", null);
        carrinho.limpar();
        Sabor.rota.ir("/pedido?id=" + pedido.id);
      } catch (falha) {
        if (falha.status === 401) return Sabor.app.exigirLogin();
        mostrarErro(erro, falha.message);
        aviso(falha.message, "erro");
        visao.resumo(raiz, estado);
      }
    });
  },
};
