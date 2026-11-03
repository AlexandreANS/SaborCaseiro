Sabor.controle = Sabor.controle || {};

Sabor.controle.cep = {
  ligar({ cep, rua, numero, dica, caixa, aoMudar }) {
    const { dicaCep, bairroAchado } = Sabor.visao.base;
    const estado = { cep: "", bairro: null, buscando: false };
    let consulta = 0;

    async function buscar(preservarRua) {
      const d = cep.value.replace(/\D/g, "");
      const vez = ++consulta;
      const tinha = estado.cep;
      estado.cep = "";
      estado.bairro = null;
      bairroAchado(caixa, null);
      if (d.length < 8) {
        estado.buscando = false;
        dicaCep(dica, "");
        if (tinha && aoMudar) aoMudar(estado);
        return;
      }
      estado.buscando = true;
      dicaCep(dica, "Buscando endereço...");
      try {
        const local = await Sabor.api.cep(d);
        if (vez !== consulta) return;
        estado.cep = local.cep;
        estado.bairro = local.bairro;
        if (local.rua && !(preservarRua && rua.value)) rua.value = local.rua;
        bairroAchado(caixa, local.bairro);
        dicaCep(dica, "Endereço encontrado.");
        if (!preservarRua && numero) numero.focus();
      } catch (falha) {
        if (vez !== consulta) return;
        dicaCep(dica, falha.message, true);
      }
      estado.buscando = false;
      if (aoMudar) aoMudar(estado);
    }

    cep.addEventListener("input", () => {
      const d = cep.value.replace(/\D/g, "").slice(0, 8);
      cep.value = d.length > 5 ? d.slice(0, 5) + "-" + d.slice(5) : d;
      buscar(false);
    });

    if (cep.value.replace(/\D/g, "").length === 8) buscar(true);
    return estado;
  },
};
