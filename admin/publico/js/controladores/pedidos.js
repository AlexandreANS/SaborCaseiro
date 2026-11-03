Adm.controle = Adm.controle || {};

Adm.controle.pedidos = {
  async montar() {
    const { aviso, moeda } = Dom;
    const { tentar } = Adm.app;
    const visao = Adm.visao.pedidos;
    if (!Adm.app.iniciar("pedidos", "Pedidos", "Aceite, recuse e acompanhe cada pedido. A lista atualiza sozinha.")) return;

    const TITULO = document.title;
    const estado = {
      filtro: "",
      todos: null,
      aberto: null,
      recusas: [],
      recusando: null,
      assinaturaLista: "",
      detalhe: null,
      som: lerSom(),
      limite: 50,
      contagem: null,
      total: null,
    };
    const alvos = visao.casca(Dom.achar("#conteudo"));
    let audio = null;

    function lerSom() {
      try {
        return localStorage.getItem("adm.som") === "1";
      } catch {
        return false;
      }
    }

    function gravarSom(ligado) {
      try {
        localStorage.setItem("adm.som", ligado ? "1" : "0");
      } catch {}
    }

    function bipe() {
      try {
        audio = audio || new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === "suspended") audio.resume();
        [0, 0.25].forEach((atraso) => {
          const osc = audio.createOscillator();
          const ganho = audio.createGain();
          osc.frequency.value = 880;
          ganho.gain.setValueAtTime(0.0001, audio.currentTime + atraso);
          ganho.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + atraso + 0.02);
          ganho.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + atraso + 0.2);
          osc.connect(ganho).connect(audio.destination);
          osc.start(audio.currentTime + atraso);
          osc.stop(audio.currentTime + atraso + 0.22);
        });
      } catch {}
    }

    async function alternarSom() {
      estado.som = !estado.som;
      gravarSom(estado.som);
      if (estado.som) {
        bipe();
        if ("Notification" in window && Notification.permission === "default") {
          try {
            await Notification.requestPermission();
          } catch {}
        }
      }
      desenharLista();
    }

    function avisarNovos(novos) {
      if (!novos.length) return;
      novos.forEach((p) => aviso(`Novo pedido #${p.id} de ${p.nome_cliente}`, "ok"));
      if (!estado.som) return;
      bipe();
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        const p = novos[novos.length - 1];
        try {
          new Notification("Novo pedido #" + p.id, { body: p.nome_cliente + " · " + moeda(p.total) });
        } catch {}
      }
    }

    const desenharLista = () =>
      visao.lista(
        alvos.lista,
        {
          pedidos: estado.todos,
          filtro: estado.filtro,
          contagem: estado.contagem,
          aberto: estado.aberto,
          som: estado.som,
          limite: estado.limite,
        },
        acoesLista
      );

    function desenharDetalhe(p) {
      estado.detalhe = p;
      visao.detalhe(alvos.detalhe, p, { recusando: estado.recusando, recusas: estado.recusas }, acoesDetalhe);
    }

    async function agir(id, acao, ok) {
      if (await tentar(acao, ok)) estado.recusando = null;
      await abrir(id);
      carregarLista();
    }

    async function passoRapido(acao, ok) {
      await tentar(acao, ok);
      carregarLista();
    }

    async function enviar(p, texto) {
      if (!(await tentar(() => Adm.api.enviarMensagem(p.id, texto)))) return false;
      const lista = await Adm.api.mensagens(p.id);
      estado.detalhe.mensagens = lista;
      visao.mensagens(lista, estado.detalhe, true);
      return true;
    }

    const acoesLista = {
      filtrar: (valor) => {
        estado.filtro = valor;
        estado.limite = 50;
        estado.assinaturaLista = "";
        carregarLista();
      },
      abrir: (id) => abrir(id),
      alternarSom,
      mais: () => {
        estado.limite += 50;
        carregarLista();
      },
      avancar: (p) =>
        p.status === "Esperando"
          ? passoRapido(() => Adm.api.aceitar(p.id), `Pedido #${p.id} aceito.`)
          : passoRapido(() => Adm.api.mudarStatus(p.id, p.proxima.status), `Pedido #${p.id}: ${p.proxima.curto.toLowerCase()}.`),
      recusarRapido: async (id) => {
        await abrir(id);
        estado.recusando = id;
        desenharDetalhe(estado.detalhe);
      },
    };

    const acoesDetalhe = {
      aceitar: (id) => agir(id, () => Adm.api.aceitar(id), "Pedido aceito!"),
      iniciarRecusa: (id) => {
        estado.recusando = id;
        desenharDetalhe(estado.detalhe);
      },
      cancelarRecusa: () => {
        estado.recusando = null;
        desenharDetalhe(estado.detalhe);
      },
      recusar: (id, corpo) => agir(id, () => Adm.api.recusar(id, corpo), "Pedido recusado."),
      status: (id, status) => agir(id, () => Adm.api.mudarStatus(id, status), "Status atualizado."),
      enviar,
    };

    async function abrir(id) {
      if (estado.aberto !== id) estado.recusando = null;
      estado.aberto = id;
      try {
        desenharDetalhe(await Adm.api.pedido(id));
        desenharLista();
      } catch (falha) {
        aviso(falha.message, "erro");
      }
    }

    function atualizarTitulo() {
      const n = estado.contagem ? estado.contagem.Esperando : 0;
      document.title = (n ? `(${n}) ` : "") + TITULO;
    }

    async function atualizarAberto() {
      if (!estado.aberto || !estado.detalhe) return;
      try {
        const p = await Adm.api.pedido(estado.aberto);
        if (p.id !== estado.aberto) return;
        if (p.status !== estado.detalhe.status) {
          if (estado.recusando === p.id && p.status !== "Esperando") estado.recusando = null;
          desenharDetalhe(p);
        } else if (p.mensagens.length !== estado.detalhe.mensagens.length) {
          estado.detalhe.mensagens = p.mensagens;
          visao.mensagens(p.mensagens, estado.detalhe);
        }
      } catch {}
    }

    async function carregarLista() {
      try {
        const [nova, contagem] = await Promise.all([Adm.api.pedidos(estado.filtro, estado.limite), Adm.api.contagem()]);
        const novos = estado.total !== null && contagem.total > estado.total ? contagem.total - estado.total : 0;
        estado.total = contagem.total;
        estado.contagem = contagem;
        estado.todos = nova;
        const assinatura = JSON.stringify([estado.filtro, estado.limite, contagem, nova.map((p) => [p.id, p.status, p.total_msgs])]);
        if (assinatura !== estado.assinaturaLista) {
          estado.assinaturaLista = assinatura;
          desenharLista();
          atualizarTitulo();
        }
        if (novos) avisarNovos((await Adm.api.pedidos("Esperando", novos)).slice(0, novos));
        await atualizarAberto();
      } catch (falha) {
        if (!estado.todos) Adm.visao.base.erro(alvos.lista, falha.message);
      }
    }

    try {
      estado.recusas = await Adm.api.recusas.listar();
    } catch (falha) {
      aviso(falha.message, "erro");
    }
    visao.vazioDetalhe(alvos.detalhe);
    await carregarLista();
    Adm.app.repetir(carregarLista, 20000);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) carregarLista();
    });
    Adm.api.tempoReal(() => carregarLista());
  },
};
