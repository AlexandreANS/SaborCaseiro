# Painel do gerente

JavaScript puro que consome `/api/gestao`.

```
npm install
npm start          # http://localhost:5501
```

Login padrão: `gerente@saborcaseiro.com.br` / `gerente123` (criado por `npm run banco` na API).

| Rota | Página |
|---|---|
| `/`, `/login` | login.html |
| `/dashboard` | resumo do dia |
| `/pedidos` | aceitar, recusar com mensagem pronta, mudar status, chat, imprimir comanda, aviso sonoro de novo pedido |
| `/cardapio` | cardápio do dia (caixas de seleção) e publicação |
| `/produtos` | CRUD de produtos |
| `/tipos` | CRUD de tipos (preço, categorias, produtos permitidos) |
| `/metricas` | pedidos, faturamento, ticket médio, clientes por semana/quinzena/mês, recorrência e relatório CSV |
| `/configuracoes` | dados do restaurante e horário, bairros e taxas, cupons, mensagens de recusa |

Cada rota é declarada no `server.js`. A API é achada por `publico/js/config.js` (`?api=` ou `http://<host>:3000`).

`publico/js/dom.js` é copiado de `comum/dom.js` (na raiz, `npm run sincronizar`). Ao excluir produto, tipo ou bairro em uso, o painel mostra o motivo e pede uma segunda confirmação.
