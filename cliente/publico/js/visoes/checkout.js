window.Sabor = window.Sabor || {};
Sabor.visao = Sabor.visao || {};

Sabor.visao.checkout = (function () {
  const { criar, achar, montar, moeda } = Dom;
  const { linha } = Sabor.visao.base;

  const molde = `
<main class="conteudo">
  <h1 class="titulo-pagina">Finalizar Pedido</h1>

  <form class="grade-checkout" id="form-checkout">
    <div>
      <p class="aviso-horario" id="aviso-horario" role="status" hidden></p>

      <div class="etapa">
        <div class="etapa-topo"><span class="etapa-num">1</span><h2>Seus Dados</h2></div>
        <div class="linha-campos">
          <div class="campo"><label for="nome">Nome Completo</label><input type="text" id="nome" name="nome" autocomplete="name" required></div>
          <div class="campo"><label for="telefone">Telefone</label><input type="tel" id="telefone" name="telefone" autocomplete="tel" inputmode="tel" required></div>
        </div>
      </div>

      <div class="etapa">
        <div class="etapa-topo"><span class="etapa-num">2</span><h2>Forma de Recebimento</h2></div>
        <div class="opcoes" id="grupo-entrega" role="radiogroup">
          <div class="opcao marcado" data-valor="entrega" role="radio" aria-checked="true" tabindex="0">
            <span><span class="opcao-nome">Entrega em domicílio</span><br><small class="suave" id="prazo-entrega">Taxa conforme o bairro.</small></span>
          </div>
          <div class="opcao" data-valor="retirada" role="radio" aria-checked="false" tabindex="0">
            <span><span class="opcao-nome">Retirada no Local</span><br><small class="suave" id="prazo-retirada"></small></span>
            <span class="opcao-preco">Sem custo adicional</span>
          </div>
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
          <div class="bairro-achado" id="bairro-achado" aria-live="polite">Informe o CEP para ver o bairro e a taxa de entrega.</div>
          <label class="linha-check"><input type="checkbox" name="salvar_endereco" checked> Salvar este endereço para os próximos pedidos</label>
        </div>
      </div>

      <div class="etapa">
        <div class="etapa-topo"><span class="etapa-num">3</span><h2>Horário</h2></div>
        <div class="opcoes" id="grupo-horario" role="radiogroup">
          <div class="opcao marcado" data-valor="asap" role="radio" aria-checked="true" tabindex="0"><span class="opcao-nome">O mais rápido possível</span></div>
          <div class="opcao" data-valor="agendar" role="radio" aria-checked="false" tabindex="0"><span class="opcao-nome">Agendar horário para hoje</span></div>
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
        <div class="etapa-topo"><span class="etapa-num">4</span><h2>Forma de Pagamento</h2></div>
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
`;

  const DICAS = {
    pix: "O Pix é feito na entrega/retirada (o motoboy ou o balcão mostram o QR Code). Nada é cobrado pelo app.",
    cartao: "Débito ou crédito na maquininha, na entrega ou no balcão. Nada é cobrado pelo app.",
    dinheiro: "Pagamento em dinheiro na entrega/retirada. Nada é cobrado pelo app.",
  };

  function preencherCliente(raiz, cliente) {
    const c = achar("#form-checkout", raiz).elements;
    c.nome.value = cliente.nome;
    c.telefone.value = cliente.telefone;
    if (!cliente.endereco) return;
    c.cep.value = cliente.endereco.cep || "";
    c.rua.value = cliente.endereco.rua;
    c.numero.value = cliente.endereco.numero;
    c.complemento.value = cliente.endereco.complemento || "";
  }

  function prazos(raiz, loja) {
    achar("#prazo-entrega", raiz).textContent = `Tempo estimado: ${loja.prazo_entrega}. Taxa conforme o bairro.`;
    achar("#prazo-retirada", raiz).textContent = `Pronto em ${loja.prazo_retirada}.`;
  }

  function marcar(raiz, seletor, valor) {
    achar(seletor, raiz)
      .querySelectorAll("[data-valor]")
      .forEach((el) => {
        const ativo = el.dataset.valor === valor;
        el.classList.toggle("marcado", ativo);
        el.setAttribute("aria-checked", String(ativo));
      });
  }

  function limitesHorario(raiz, func) {
    const campo = achar("#form-checkout", raiz).elements.horario_agendado;
    campo.min = func.agora > func.abre ? func.agora : func.abre;
    campo.max = func.fecha;
  }

  function avisoHorario(raiz, texto) {
    const faixa = achar("#aviso-horario", raiz);
    faixa.textContent = texto;
    faixa.hidden = false;
  }

  function esconderImediato(raiz) {
    achar("[data-valor=asap]", raiz).hidden = true;
  }

  function atualizar(raiz, estado) {
    const c = achar("#form-checkout", raiz).elements;
    const entrega = estado.entrega === "entrega";
    achar("#bloco-endereco", raiz).hidden = !entrega;
    c.cep.required = c.rua.required = c.numero.required = entrega;
    achar("#campo-horario", raiz).hidden = estado.horario !== "agendar";
    c.horario_agendado.required = estado.horario === "agendar";
    achar("#pgto-dinheiro", raiz).hidden = entrega;
    achar("#campo-troco", raiz).hidden = estado.pagamento !== "dinheiro";
    achar("#dica-pagamento", raiz).textContent = DICAS[estado.pagamento];
  }

  function resumo(raiz, estado) {
    const cot = estado.cotacao;
    const semTaxa = cot && estado.entrega === "entrega" && cot.taxa_entrega === null;
    montar(
      achar("#resumo-pedido", raiz),
      criar("h2", { text: "Resumo do Pedido" }),
      cot
        ? [
            cot.itens.map((i) => [
              linha(`${i.quantidade}x ${i.tipo_nome}`, moeda(i.preco_unitario * i.quantidade)),
              ...i.ingredientes
                .filter((g) => g.adicional)
                .map((g) => linha("+ extra: " + g.nome, moeda(g.preco_extra * i.quantidade), "sub")),
            ]),
            cot.desconto > 0 ? linha(`Cupom ${cot.cupom}`, "– " + moeda(cot.desconto), "desconto") : null,
            estado.entrega === "entrega"
              ? linha(
                  cot.bairro ? `Entrega — ${cot.bairro.nome}` : "Taxa de Entrega",
                  cot.taxa_entrega === null ? "informe o CEP" : moeda(cot.taxa_entrega)
                )
              : linha("Retirada no local", "Sem custo adicional"),
            linha("Total", moeda(cot.total), "total"),
          ]
        : criar("p", { class: "suave", text: "Calculando..." }),
      criar("button", {
        type: "submit",
        id: "botao-confirmar",
        class: "botao botao-principal botao-cheio espaco-cima",
        disabled: !cot || semTaxa || estado.fechado,
        text: "Confirmar Pedido",
      })
    );
  }

  function enviando(raiz) {
    const botao = achar("#botao-confirmar", raiz);
    botao.disabled = true;
    botao.textContent = "Enviando pedido...";
  }

  return { molde, preencherCliente, prazos, marcar, limitesHorario, avisoHorario, esconderImediato, atualizar, resumo, enviando };
})();
