# API do Sabor Caseiro

```
npm install          # ou, na raiz do projeto, npm install instala tudo
npm start              # http://localhost:3000 (cria o que falta no banco ao subir)
npm run banco          # só prepara o banco, sem subir a API (pode repetir)
npm run banco:reset    # apaga tudo e recria (destrutivo)
```

Estrutura MVC: `rotas/` → `controladores/` → `modelos/` (SQL), com `visoes/` para o JSON e `servicos/` para regras como o cálculo de preço (`servicos/precos.js`). Todas as rotas começam em `/api`. Autenticação por `Authorization: Bearer <token>`.

## Cliente

| Método | Rota | |
|---|---|---|
| POST | `/acesso/cadastro`, `/acesso/login` | |
| POST | `/acesso/esqueci` `{email}`, `/acesso/redefinir` `{token, senha}` | recuperar senha por link (30 min). O link é escrito no console da API (`util/email.js`); com `SABOR_DEV_LINK=1` também volta na resposta, só para testes |
| GET / PUT / DELETE | `/acesso/eu` | ver, editar (e trocar senha), excluir conta |
| GET | `/cep/:cep` | consulta o CEP (ViaCEP), procura o bairro na tabela `bairros` (sem diferenciar acento/maiúscula) e devolve `{cep, rua, cidade, uf, bairro:{id,nome,taxa_entrega}}`; 404 se o CEP não existe, 422 se o bairro não é atendido, 503 se o ViaCEP estiver fora |
| GET | `/cardapio` | cardápio publicado do dia + bairros; sem cardápio, traz `proximo` (data do próximo publicado) |
| GET | `/funcionamento` | horário de funcionamento e se está aberto agora |
| GET | `/loja` | nome, endereço, telefone, prazos e horário (editáveis pelo gerente) + `funcionamento` |
| POST | `/carrinho/cotacao` | calcula preços, cupom e taxa |
| POST / GET | `/pedidos` | cria pedido / lista pedidos do cliente (`?limite=`, padrão 20) |
| POST | `/pedidos/:id/cancelar` | cancela pedido ainda aguardando aceite (409 se já respondido) |
| GET | `/pedidos/eventos` | tempo real (SSE) com avisos de pedido/mensagem do cliente |
| GET | `/pedidos/:id` | detalhe, status e motivo da recusa |
| GET | `/pedidos/:id/repetir` | itens do pedido ainda disponíveis hoje (`itens`) e os que saíram (`indisponiveis`) |
| GET / POST | `/pedidos/:id/mensagens` | chat com a equipe |

## Gerente (`/api/gestao`, exige login do gerente)

| Rota | |
|---|---|
| POST `/login`, GET `/eu` | acesso do gerente |
| GET `/pedidos?status=&limite=`, GET `/pedidos/contagem`, GET `/pedidos/:id` | lista (padrão 50), contagem por status e detalhe |
| GET `/eventos` | tempo real (SSE): `novo`, `pedido` e `mensagem` |
| GET `/metricas?periodo=semana\|quinzena\|mes` | pedidos, faturamento bruto, ticket médio, clientes ativos/novos/recorrentes por período, médias, recorrência e clientes mais frequentes |
| GET / PUT `/loja` | dados do restaurante e horário de funcionamento |
| POST `/pedidos/:id/aceitar` | Esperando → Preparando |
| PUT `/pedidos/:id/status` | entrega: Saiu para Entrega, Concluído (Entregue); retirada: Pronto para Retirada, Concluído (Retirado). O pedido traz `status_rotulo` e `passos` |
| POST `/pedidos/:id/recusar` | `{mensagem_id}` ou `{motivo}` |
| GET / POST `/pedidos/:id/mensagens` | chat |
| `/produtos`, `/tipos`, `/bairros`, `/cupons`, `/recusas` | CRUD (GET, POST, PUT `/:id`, DELETE `/:id`; cupons usam o código no lugar do id). Excluir tipo/produto do cardápio de hoje ou bairro com pedido em andamento responde 409 com `confirmar: true`; repita com `?forcar=1` para excluir mesmo assim |
| GET `/cardapio-dia/hoje`, GET / PUT `/cardapio-dia/:data`, POST `/cardapio-dia/:data/publicar` | monta e publica o cardápio |

Itens do carrinho: marmita `{tipo_id, ingredientes, adicionais, quantidade, observacoes}` ou extra `{extra_id, quantidade}`.

Em cada categoria do tipo, `ingredientes` deve ter exatamente `minimo` ids (principais, sem custo) e `adicionais` são ids que podem repetir, cada um cobrado pelo `preco_extra` do ingrediente; principais + adicionais não passam de `maximo`.

Preços, cupom e taxa são sempre calculados no servidor; o cliente envia só ids e quantidades.

Regras de segurança e consistência:

- Pedido só é aceito dentro do horário de funcionamento (editável em Configurações; `SABOR_HORARIO` é o valor inicial e `sempre` desliga a regra); agendamento precisa estar dentro do horário e no futuro.
- Tempo real: o servidor avisa os fronts por SSE (`text/event-stream`) e eles buscam os dados de novo; a consulta periódica (20–60 s) fica como reserva. Os avisos ficam na memória do processo (uma instância).
- Login do cliente e do gerente: após `LOGIN_MAX` falhas (padrão 8) por IP e e-mail, responde 429 por 15 minutos. Atrás de proxy, defina `TRUST_PROXY=1`.
- Aceitar, recusar e mudar status só valem se o pedido ainda está no status lido; senão, 409.

Testes: `npm test` (na raiz ou em `api/`). Ele cria o banco temporário `sabor_caseiro_teste`, sobe uma API de teste na porta 3100, roda tudo e apaga o banco; não precisa subir nada antes. Para rodar contra uma API já em execução: `npm run test:vivo` em `api/`.

### Próximo passo do pedido
Todo pedido devolvido pela API traz `proxima` (`{status, texto, curto}`, o único passo que o gerente precisa dar) e `anterior` (desfazer, só em "Saiu para Entrega" e "Pronto para Retirada"). O painel usa esses campos para mostrar um botão grande por pedido.

### Bairro e taxa pelo CEP
O cliente não escolhe mais o bairro: ele informa o CEP e a API descobre o bairro (`servicos/cep.js`) e busca a taxa na tabela `bairros`. A cotação aceita `cep` no lugar de `bairro_id`, e `POST /pedidos` exige `endereco.cep` quando é entrega (o `bairro_id` enviado pelo cliente é ignorado). Bairro que não está na tabela, ou está inativo, devolve erro 422 "Ainda não entregamos no bairro X".

Para testar sem internet, os testes sobem um ViaCEP falso na porta 5599 e `npm test` já aponta a API de teste para ele (com `test:vivo`, inicie a API com `SABOR_CEP_URL=http://localhost:5599/ws`, senão os testes de CEP são pulados).

Pedido idempotente: `POST /pedidos` aceita `chave_envio` (8 a 64 caracteres); repetir a mesma chave devolve o pedido já criado (status 200) em vez de criar outro. Endereço da conta: `PUT /acesso/eu/endereco` (`cep`, `rua`, `numero`, `complemento`) e `DELETE /acesso/eu/endereco`.

### Sessão
O token carrega uma versão da sessão do cliente. Trocar a senha (`PUT /acesso/eu` com `nova_senha`, que devolve um `token` novo) ou redefinir por e-mail invalida os tokens antigos; apagar a conta também. Rotas protegidas conferem a versão no banco a cada chamada. Token de cliente vale 7 dias; quando tem mais de 1 dia de emitido, a resposta traz o cabeçalho `X-Token-Renovado` com um token novo (o front troca sozinho). Token de gerente vale 12 horas. Errar a senha atual mais de 5 vezes em `PUT /acesso/eu` (com `nova_senha`) ou `DELETE /acesso/eu` bloqueia novas tentativas por 15 minutos.

### Cardápio do dia
`POST /gestao/cardapio-dia/:data/copiar` copia tipos e produtos ativos do último cardápio anterior para a data (sem publicar); responde com `copiado_de`. Recusa se a data já está publicada.

### CORS
`util/origens.js` decide, por requisição, se a origem do navegador pode ler a resposta. Sempre permitidas: `localhost` e `127.0.0.1` (qualquer porta) e as origens de `SABOR_ORIGENS` e `SABOR_URL_CLIENTE`; fora de produção, também o mesmo host da API. Origem não permitida não recebe `Access-Control-Allow-Origin`, e o navegador descarta a resposta (inclusive o pré-voo `OPTIONS`). Requisições sem cabeçalho `Origin` passam normalmente. Só é preciso configurar `SABOR_ORIGENS` quando os sites forem publicados em um domínio.
