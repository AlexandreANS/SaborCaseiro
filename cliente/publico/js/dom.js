window.Dom = (function () {
  const moeda = (n) => Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const achar = (seletor, raiz = document) => raiz.querySelector(seletor);

  function criar(tag, attrs, ...filhos) {
    const el = document.createElement(tag);
    for (const [chave, valor] of Object.entries(attrs || {})) {
      if (valor === null || valor === undefined || valor === false) continue;
      if (chave === "class") el.className = valor;
      else if (chave === "text") el.textContent = valor;
      else if (chave === "value") el.value = valor;
      else if (chave.startsWith("on")) el.addEventListener(chave.slice(2), valor);
      else el.setAttribute(chave, valor === true ? "" : valor);
    }
    for (const f of filhos.flat(Infinity)) {
      if (f === null || f === undefined || f === false) continue;
      el.append(f.nodeType ? f : document.createTextNode(String(f)));
    }
    return el;
  }

  function montar(alvo, ...filhos) {
    alvo.replaceChildren(...filhos.flat(Infinity).filter((f) => f !== null && f !== undefined && f !== false));
  }

  function aviso(mensagem, tipo = "ok") {
    let pilha = achar("#avisos");
    if (!pilha) {
      pilha = criar("div", { id: "avisos", "aria-live": "polite" });
      document.body.append(pilha);
    }
    const el = criar("div", { class: "aviso aviso-" + tipo, role: tipo === "erro" ? "alert" : "status", text: mensagem });
    pilha.append(el);
    setTimeout(() => el.remove(), 4500);
  }

  function tempoReal(obter, aoEvento) {
    let parado = false;
    let controle = null;
    let espera = 1000;
    let caiu = false;

    async function ligar() {
      if (parado) return;
      controle = new AbortController();
      try {
        const { url, token } = obter();
        const resp = await fetch(url, { headers: token ? { Authorization: "Bearer " + token } : {}, signal: controle.signal });
        if (resp.status === 401) {
          parado = true;
          return;
        }
        if (!resp.ok || !resp.body) throw new Error("sem fluxo");
        espera = 1000;
        if (caiu) aoEvento({ tipo: "reconectado" });
        const leitor = resp.body.getReader();
        const decodificador = new TextDecoder();
        let resto = "";
        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          resto += decodificador.decode(value, { stream: true });
          const blocos = resto.split("\n\n");
          resto = blocos.pop();
          for (const bloco of blocos) {
            const linha = bloco.split("\n").find((l) => l.startsWith("data:"));
            if (!linha) continue;
            try { aoEvento(JSON.parse(linha.slice(5))); } catch {}
          }
        }
      } catch {}
      caiu = true;
      if (!parado) setTimeout(ligar, (espera = Math.min(espera * 2, 30000)));
    }

    ligar();
    return () => {
      parado = true;
      if (controle) controle.abort();
    };
  }

  return { moeda, achar, criar, montar, aviso, tempoReal };
})();
