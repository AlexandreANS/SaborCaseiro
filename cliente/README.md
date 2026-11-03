# Front do cliente

Página única em JavaScript puro, sem build. Existe só o `publico/index.html`: o JS busca os dados na API com `fetch` e cria as telas, como no cliente-app. A mesma pasta roda no navegador, em WebView e abrindo o `index.html` direto do arquivo (app híbrido: Capacitor, Cordova etc.).

```
npm install
npm start          # http://localhost:5500
```

## Como funciona

| Arquivo | Papel |
|---|---|
| `js/roteador.js` | rotas por `#/nome` (funcionam em qualquer ambiente), exige login, limpa timers ao sair da tela |
| `js/telas/*.js` | uma tela por arquivo; cada uma monta o próprio conteúdo dentro de `#app` |
| `js/dom.js` | helpers de DOM compartilhados (`criar`, `achar`, `montar`, `moeda`, `aviso`); copiado de `comum/dom.js` |
| `js/tela.js` | cabeçalho, barra inferior do celular, rodapé com horário, repetir pedido |
| `js/api.js` | todas as chamadas `fetch` à API |
| `js/dados.js` | sessão e carrinho (localStorage) |
| `js/config.js` | endereço da API (`?api=`, `API_FIXA` ou `http://<host>:3000`) |

## Rotas

| Rota | Tela |
|---|---|
| `#/login`, `#/cadastro` | acesso |
| `#/esqueci`, `#/redefinir?token=` | recuperar senha |
| `#/home` | início e cardápio do dia |
| `#/montar` | montar a marmita |
| `#/carrinho` | carrinho, extras e cupom |
| `#/checkout` | finalizar pedido |
| `#/pedido?id=` | acompanhar pedido (status, chat, motivo da recusa) |
| `#/pedidos` | pedidos anteriores |
| `#/conta` | minha conta |

O `server.js` declara uma rota para cada tela (`/checkout`, `/pedido`...); cada uma redireciona para `/#/checkout` etc. Só `/`, `/css`, `/js` e `/img` são servidos como arquivos.

## Login

O app abre em `#/home`. O cliente pode entrar na conta antes de pedir, ou montar a marmita, mexer no carrinho e aplicar cupom sem estar logado: só `#/checkout`, `#/pedido`, `#/pedidos` e `#/conta` exigem login. Ao tentar finalizar deslogado, vai para o login e volta ao checkout com o carrinho intacto.

## Conforto

- Carrinho: ao abrir o carrinho ou o checkout, itens que não estão mais no cardápio de hoje saem com aviso.
- "Pedir de novo" na tela do pedido e em Meus Pedidos (pedidos concluídos ou recusados) coloca no carrinho o que ainda está disponível.
- Checkout: ao digitar o CEP, rua e bairro são preenchidos (ViaCEP, via internet do aparelho); se a loja estiver fechada, aparece o aviso e o botão de confirmar fica desativado.
- Cancelar: na tela do pedido, enquanto o restaurante não aceitou.
- Tempo real: a tela do pedido e Meus Pedidos abrem um fluxo SSE (`Sabor.rota.ouvir`) e atualizam na hora; a consulta a cada 20 s fica de reserva. Meus Pedidos mostra 20 por vez.
- Endereço, telefone, prazos e horário vêm de `GET /api/loja`.
- Sem cardápio hoje, a home e a tela de montar mostram a data do próximo cardápio publicado.
- Ao trocar de tela, o foco vai para o título (leitores de tela).
