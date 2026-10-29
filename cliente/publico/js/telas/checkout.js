Sabor.telas.checkout = {
  titulo: "Finalizar Pedido",
  ativa: "carrinho",
  exigeLogin: true,
  async montar(raiz, params) {
    Sabor.tela.desenhar(raiz, `
<main class="conteudo">
  <h1 class="titulo-pagina">Finalizar Pedido</h1>

  <form class="grade-checkout" id="form-checkout">
    <div>
      <p class="aviso-horario" id="aviso-horario" role="status" hidden></p>

      <div class="etapa">
        <div class="etapa-topo"><span class="etapa-num">1</span><h3>Seus Dados</h3></div>
        <div class="linha-campos">
          <div class="campo"><label for="nome">Nome Completo</label><input type="text" id="nome" name="nome" autocomplete="name" required></div>
          <div class="campo"><label for="telefone">Telefone</label><input type="tel" id="telefone" name="telefone" autocomplete="tel" inputmode="tel" required></div>
        </div>
      </div>

      <div class="etapa">
        <div class="etapa-topo"><span class="etapa-num">2</span><h3>Forma de Recebimento</h3></div>
        <div class="opcoes" id="grupo-entrega" role="radiogroup">
          <label class="opcao marcado" data-valor="entrega" role="radio" aria-checked="true" tabindex="0">
            <span><span class="opcao-nome">Entrega em domicílio</span><br><small class="suave" id="prazo-entrega">Taxa conforme o bairro.</small></span>
          </label>
          <label class="opcao" data-valor="retirada" role="radio" aria-checked="false" tabindex="0">
            <span><span class="opcao-nome">Retirada no Local</span><br><small class="suave" id="prazo-retirada"></small></span>
            <span class="opcao-preco">Sem custo adicional</span>
          </label>
        </div>

        <div id="bloco-endereco" class="bloco-endereco">
          <div class="linha-campos">
            <div class="campo"><label for="cep">CEP</label><input type="text" id="cep" name="cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9"><small class="suave dica-cep" id="dica-cep" aria-live="polite"></small></div>
            <div class="campo"><label for="rua">Rua / Logradouro</label><input type="text" id="rua" name="rua" autocomplete="address-line1"></div>
          </div>
          <div class="linha-campos">
            <div class="campo"><label for="numero">Número</label><input type="text" id="numero" name="numero"></div>
            <div class="campo"><label for="complemento">Complemento</label><input type="text" id="complemento" name="complemento" placeholder="Apto, bloco..."></div>
          </div>
          <div class="campo">
            <label for="bairro_id">Bairro</label>
            <select id="bairro_id" name="bairro_id"><option value="">Carregando...</option></select>
          </div>
          <label class="linha-check"><input type="checkbox" name="salvar_endereco" checked> Salvar este endereço para os próximos pedidos</label>
        </div>
      </div>

      <div class="etapa">
        <div class="etapa-topo"><span class="etapa-num">3</span><h3>Horário</h3></div>
        <div class="opcoes" id="grupo-horario" role="radiogroup">
          <label class="opcao marcado" data-valor="asap" role="radio" aria-checked="true" tabindex="0"><span class="opcao-nome">O mais rápido possível</span></label>
          <label class="opcao" data-valor="agendar" role="radio" aria-checked="false" tabindex="0"><span class="opcao-nome">Agendar horário para hoje</span></label>
        </div>
        <div class="campo espaco-cima" id="campo-horario" hidden>
          <label for="horario_agendado">Horário desejado</label>
          <input type="time" id="horario_agendado" name="horario_agendado">
        </div>
        <div class="campo espaco-cima">
          <label for="observacoes">Observações do pedido</label>
          <textarea id="observacoes" name="observacoes" rows="2" maxlength="500" placeholder="Ex.: interfone com defeito, ligar ao chegar"></textarea>
        </div>
      </div>

      <div class="etapa">
        <div class="etapa-topo"><span class="etapa-num">4</span><h3>Forma de Pagamento</h3></div>
        <p class="etapa-dica">O pagamento é feito na entrega ou na retirada — o app apenas registra a sua escolha. Na entrega aceitamos só Pix ou cartão; dinheiro apenas na retirada.</p>
        <div class="pagamentos" id="grupo-pagamento" role="radiogroup">
          <div class="pagamento marcado" id="pgto-pix" data-valor="pix" role="radio" aria-checked="true" tabindex="0">Pix<br><small>QR Code na entrega</small></div>
          <div class="pagamento" data-valor="cartao" role="radio" aria-checked="false" tabindex="0">Cartão<br><small>Débito ou Crédito</small></div>
          <div class="pagamento" id="pgto-dinheiro" data-valor="dinheiro" role="radio" aria-checked="false" tabindex="0">Dinheiro<br><small>Apenas na retirada</small></div>
        </div>
        <p class="etapa-dica sem-recuo espaco-cima" id="dica-pagamento"></p>
        <div class="campo" id="campo-troco" hidden>
          <label for="troco_para">Troco para quanto? (opcional)</label>
          <input type="number" id="troco_para" name="troco_para" min="1" step="0.01" inputmode="decimal" placeholder="Ex.: 100">
        </div>
      </div>

      <p id="form-erro" class="msg-erro" role="alert" hidden></p>
    </div>

    <aside class="caixa-pedido resumo-checkout" id="resumo-pedido"></aside>
  </form>
</main>
`);
    const { criar, achar, montar, moeda, aviso, mostrarErro, exigirLogin } = Sabor.tela;
    const { carrinho, sessao } = Sabor.dados;
    if (!carrinho.itens().length) {
      Sabor.rota.ir("/montar", true);
      return;
    }

    const form = achar("#form-checkout", raiz);
    const erro = achar("#form-erro", raiz);
    const caixa = achar("#resumo-pedido", raiz);
    const campos = form.elements;
    const estado = { entrega: "entrega", horario: "asap", pagamento: "pix", cotacao: null, fechado: false };
    let func = null;

    try {
      const cliente = await Sabor.api.eu();
      sessao.atualizarCliente(cliente);
      campos.nome.value = cliente.nome;
      campos.telefone.value = cliente.telefone;
      if (cliente.endereco) {
        campos.cep.value = cliente.endereco.cep || "";
        campos.rua.value = cliente.endereco.rua;
        campos.numero.value = cliente.endereco.numero;
        campos.complemento.value = cliente.endereco.complemento || "";
        campos.bairro_id.dataset.inicial = cliente.endereco.bairro_id || "";
      }
    } catch (falha) {
      if (falha.status === 401) return exigirLogin();
    }

    try {
      const [cardapio, dadosLoja] = await Promise.all([Sabor.api.cardapio(), Sabor.tela.loja(true)]);
      func = dadosLoja ? dadosLoja.funcionamento : null;
      if (dadosLoja) {
        achar("#prazo-entrega", raiz).textContent = `Tempo estimado: ${dadosLoja.prazo_entrega}. Taxa conforme o bairro.`;
        achar("#prazo-retirada", raiz).textContent = `Pronto em ${dadosLoja.prazo_retirada}.`;
      }
      const fora = carrinho.reconciliar(cardapio);
      if (fora.length) {
        aviso("Removidos do carrinho (fora do cardápio de hoje): " + fora.join(", ") + ".", "erro");
        if (!carrinho.itens().length) {
          Sabor.rota.ir("/carrinho", true);
          return;
        }
      }
      const bairros = cardapio.bairros;
      const lista = campos.bairro_id;
      lista.replaceChildren(criar("option", { value: "", text: "Selecione o bairro" }),
        ...bairros.map((b) => criar("option", { value: b.id, text: `${b.nome} — ${moeda(b.taxa_entrega)}` })));
      if (lista.dataset.inicial) lista.value = lista.dataset.inicial;
    } catch (falha) {
      mostrarErro(erro, falha.message);
    }

    function grupo(seletor, chave, aoMudar) {
      const raiz = achar(seletor);
      raiz.querySelectorAll("[data-valor]").forEach((el) => {
        el.addEventListener("click", () => {
          raiz.querySelectorAll("[data-valor]").forEach((outro) => {
            outro.classList.remove("marcado");
            outro.setAttribute("aria-checked", "false");
          });
          el.classList.add("marcado");
          el.setAttribute("aria-checked", "true");
          estado[chave] = el.dataset.valor;
          if (aoMudar) aoMudar();
        });
        el.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); el.click(); }
        });
      });
    }

    function ajustarHorario() {
      if (!func || func.sempre) return;
      const faixa = achar("#aviso-horario", raiz);
      const campo = campos.horario_agendado;
      campo.min = func.agora > func.abre ? func.agora : func.abre;
      campo.max = func.fecha;
      const antes = func.agora < func.abre;
      const depois = func.agora >= func.fecha;
      if (!func.dia_aberto || depois) {
        estado.fechado = true;
        faixa.textContent = "Estamos fechados agora. Funcionamos " + func.texto + ".";
        faixa.hidden = false;
      } else if (antes) {
        achar("[data-valor=asap]", raiz).hidden = true;
        achar("[data-valor=agendar]", raiz).click();
        faixa.textContent = "Ainda não abrimos. Agende um horário para hoje a partir das " + func.abre + ".";
        faixa.hidden = false;
      }
    }

    function atualizarTela() {
      achar("#bloco-endereco", raiz).hidden = estado.entrega !== "entrega";
      campos.rua.required = campos.numero.required = campos.bairro_id.required = estado.entrega === "entrega";
      achar("#campo-horario", raiz).hidden = estado.horario !== "agendar";
      campos.horario_agendado.required = estado.horario === "agendar";
      const dinheiro = achar("#pgto-dinheiro", raiz);
      dinheiro.hidden = estado.entrega === "entrega";
      if (estado.entrega === "entrega" && estado.pagamento === "dinheiro") achar("#pgto-pix", raiz).click();
      achar("#campo-troco", raiz).hidden = estado.pagamento !== "dinheiro";
      achar("#dica-pagamento", raiz).textContent = {
        pix: "O Pix é feito na entrega/retirada (o motoboy ou o balcão mostram o QR Code). Nada é cobrado pelo app.",
        cartao: "Débito ou crédito na maquininha, na entrega ou no balcão. Nada é cobrado pelo app.",
        dinheiro: "Pagamento em dinheiro na entrega/retirada. Nada é cobrado pelo app.",
      }[estado.pagamento];
    }

    async function cotar() {
      try {
        estado.cotacao = await Sabor.api.cotar(carrinho.paraApi(), {
          tipo_entrega: estado.entrega, bairro_id: campos.bairro_id.value || undefined, cupom: carrinho.cupom(),
        });
        mostrarErro(erro, "");
      } catch (falha) {
        estado.cotacao = null;
        mostrarErro(erro, falha.message);
      }
      desenharResumo();
    }

    function linha(rotulo, valor, classe = "") {
      return criar("div", { class: "linha-resumo " + classe }, criar("span", { text: rotulo }), criar("span", { text: valor }));
    }

    function desenharResumo() {
      const cot = estado.cotacao;
      const semTaxa = cot && estado.entrega === "entrega" && cot.taxa_entrega === null;
      montar(caixa,
        criar("h4", { text: "Resumo do Pedido" }),
        cot ? [
          cot.itens.map((i) => linha(`${i.quantidade}x ${i.tipo_nome}`, moeda(i.preco_unitario * i.quantidade))),
          cot.desconto > 0 ? linha(`Cupom ${cot.cupom}`, "– " + moeda(cot.desconto), "desconto") : null,
          estado.entrega === "entrega"
            ? linha("Taxa de Entrega", cot.taxa_entrega === null ? "escolha o bairro" : moeda(cot.taxa_entrega))
            : linha("Retirada no local", "Sem custo adicional"),
          linha("Total", moeda(cot.total), "total"),
        ] : criar("p", { class: "suave", text: "Calculando..." }),
        criar("button", { type: "submit", id: "botao-confirmar", class: "botao botao-principal botao-cheio espaco-cima", disabled: !cot || semTaxa || estado.fechado, text: "Confirmar Pedido" }));
    }

    function semAcento(t) {
      return String(t).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    }

    function configurarCep() {
      const dica = achar("#dica-cep", raiz);
      let ultimo = "";
      campos.cep.addEventListener("input", async () => {
        const d = campos.cep.value.replace(/\D/g, "").slice(0, 8);
        campos.cep.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
        dica.textContent = "";
        if (d.length < 8 || d === ultimo) return;
        ultimo = d;
        dica.textContent = "Buscando endereço...";
        try {
          const resp = await fetch("https://viacep.com.br/ws/" + d + "/json/");
          const dados = await resp.json();
          if (dados.erro) {
            dica.textContent = "CEP não encontrado. Preencha o endereço manualmente.";
            return;
          }
          if (dados.logradouro) campos.rua.value = dados.logradouro;
          const opcao = [...campos.bairro_id.options].find((o) => o.value && semAcento(o.text.split(" — ")[0]) === semAcento(dados.bairro));
          if (opcao) campos.bairro_id.value = opcao.value;
          dica.textContent = opcao ? "Endereço preenchido." : "Endereço preenchido. Escolha o bairro na lista.";
          if (opcao) cotar();
          campos.numero.focus();
        } catch {
          dica.textContent = "Não foi possível buscar o CEP. Preencha manualmente.";
        }
      });
    }

    grupo("#grupo-entrega", "entrega", () => { atualizarTela(); cotar(); });
    grupo("#grupo-horario", "horario", atualizarTela);
    grupo("#grupo-pagamento", "pagamento", atualizarTela);
    campos.bairro_id.addEventListener("change", cotar);
    ajustarHorario();
    atualizarTela();
    configurarCep();
    desenharResumo();
    cotar();

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      mostrarErro(erro, "");
      const botao = achar("#botao-confirmar", raiz);
      botao.disabled = true;
      botao.textContent = "Enviando pedido...";
      const entrega = estado.entrega === "entrega";
      try {
        const pedido = await Sabor.api.criarPedido({
          nome: campos.nome.value,
          telefone: campos.telefone.value,
          tipo_entrega: estado.entrega,
          bairro_id: entrega ? Number(campos.bairro_id.value) : undefined,
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
        });
        carrinho.limpar();
        Sabor.rota.ir("/pedido?id=" + pedido.id);
      } catch (falha) {
        if (falha.status === 401) return exigirLogin();
        mostrarErro(erro, falha.message);
        aviso(falha.message, "erro");
        desenharResumo();
      }
    });
  },
};
