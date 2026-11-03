# Sabor Caseiro

Três partes independentes:

| Pasta | O que é | Porta |
|---|---|---|
| `api/` | API REST (Express + PostgreSQL), usada pelo cliente e pelo gerente | 3000 |
| `cliente/` | Front do cliente: página única em JavaScript puro (web e mobile) | 5500 |
| `admin/` | Painel do gerente em JavaScript puro | 5501 |

## Estrutura (MVC)

Nas três partes o código segue a mesma divisão: o **modelo** guarda e busca dados, a **visão** só desenha, o **controlador** liga os dois.

```
api/
  rotas/          só liga cada URL a uma função do controlador
  controladores/  recebe a requisição, valida, chama os modelos e responde (gestao/ = painel do gerente)
  modelos/        todo o SQL: cliente, pedido, cardapio, tipo, produto, bairro, cupom, recusa, loja, metrica...
  visoes/         monta o JSON de resposta (cardápio do dia, rótulos e passos do pedido)
  servicos/       regras que usam vários modelos: precos.js (cotação), funcionamento.js, eventos.js (tempo real)
  util/           segurança, limite de tentativas, validação, erros
  banco/          esquema.sql, dados.sql e iniciar.js (cria o banco ao subir)

cliente/publico/js/   e   admin/publico/js/
  modelos/        api.js (fetch), sessao.js, carrinho.js (cliente)
  visoes/         base.js (cabeçalho, rodapé, helpers) + um arquivo por tela com o HTML e o desenho
  controladores/  um arquivo por tela: estado, eventos e chamadas à API (roteador.js e app.js no cliente)
```

## Como rodar

Só é preciso ter o Node 20+ e o PostgreSQL rodando. Na raiz:

```
npm install      # instala a raiz, a api, o cliente e o admin de uma vez
npm run dev      # sobe API (3000), cliente (5500) e gerente (5501) juntos, com recarga automática; Ctrl+C para tudo
```

A API cria sozinha o que falta: o banco `sabor_caseiro` (se não existir), as tabelas, os dados iniciais e o gerente. O mesmo passo existe à parte em `npm run banco`, que pode ser repetido sem perder nada. Para apagar tudo e recomeçar: `npm run banco:reset` (destrói os dados).
Se o Postgres estiver desligado ou a senha estiver errada, a API diz isso em uma frase em vez de mostrar um erro técnico.

Comandos da raiz:

| Comando | O que faz |
|---|---|
| `npm run dev` | sobe as três partes com recarga automática |
| `npm start` | sobe as três partes sem recarga (para uso real; com `NODE_ENV=production`) |
| `npm run api` / `cliente` / `admin` | sobe só uma das partes |
| `npm test` | cria um banco temporário `sabor_caseiro_teste`, sobe uma API de teste na porta 3100, roda os testes e apaga tudo; o banco de desenvolvimento não é tocado |
| `npm run verificar` | ESLint (variáveis sem uso, erros comuns) |
| `npm run formatar` / `formatar:ver` | Prettier (aplica / só confere o estilo) |
| `npm run sincronizar` | copia `comum/dom.js` e `comum/estaticos.js` para `cliente/` e `admin/` (já roda sozinho no `dev` e no `start`) |

Variáveis da API (opcionais, modelo em `api/.env.example`; carregue com `node --env-file=.env server.js`):
`DATABASE_URL` ou `PGHOST/PGUSER/PGPASSWORD/PGDATABASE`, `PGSSL=false` para banco local, `SABOR_SECRET` (segredo dos tokens),
`SABOR_HORARIO` (funcionamento, padrão `1-6 11:00-15:00`; `sempre` desliga a regra), `LOGIN_MAX` (tentativas de login por 15 min),
`CADASTRO_MAX` (cadastros por IP por hora), `PEDIDO_MAX` (pedidos por cliente por 15 min), `SABOR_CEP_URL` (padrão ViaCEP),
`GERENTE_EMAIL` e `GERENTE_SENHA` (padrão `gerente@saborcaseiro.com.br` / `gerente123`).

Em produção (`NODE_ENV=production`) a API se recusa a subir sem `SABOR_SECRET` de pelo menos 24 caracteres, com `SABOR_DEV_LINK=1`, ou sem `GERENTE_SENHA` forte ao criar o gerente.

CORS: a API só deixa o navegador ler respostas para os sites autorizados. Sites em `localhost` e `127.0.0.1` (qualquer porta) sempre valem, então rodando tudo na própria máquina nada precisa ser configurado. Ao publicar com um domínio, liste os sites em `SABOR_ORIGENS` (separados por vírgula, ex.: `https://meusite.com,https://painel.meusite.com`); fora de produção, o mesmo host da API em outra porta também vale. Chamadas sem navegador (curl, Postman, outros servidores) não são afetadas.

Cuidados que já vêm prontos: logins que deixam de valer ao trocar a senha ou apagar a conta (o login do cliente vale 7 dias e é renovado sozinho a cada dia de uso; o do gerente vale 12 h), limite de 5 tentativas erradas da senha atual ao trocar a senha ou apagar a conta (`SENHA_MAX`), aviso no console quando a API está atrás de proxy sem `TRUST_PROXY=1`, senha limitada a 128 caracteres, registro de cada requisição no console da API (`SABOR_LOG=0` desliga), encerramento limpo (Ctrl+C fecha conexões e o banco), cabeçalhos de segurança (Helmet, com CSP nos fronts), limite de tentativas em login, cadastro, CEP, pedidos e mensagens, pedido idempotente (um duplo clique ou reenvio não cria dois pedidos), arquivos `js/` e `css/` com versão na URL e cache longo, compressão gzip.

Os fronts chamam `http://<mesmo host>:3000`. Em produção com a API em outro endereço, informe-o aos servidores dos fronts em `SABOR_API_URL` (a política de segurança só permite conexões com a API configurada; um link com `?api=` apontando para um site de terceiros é bloqueado pelo navegador). Em desenvolvimento, `?api=http://outro-host:3000` continua funcionando para o mesmo host.

Postgres sem instalar nada: `docker compose up -d` na raiz sobe um Postgres já com a senha padrão. Um arquivo `.env` em `api/` é carregado sozinho (Node 20.12+).

E-mail de recuperação de senha: defina `SMTP_URL` (ex.: `smtps://usuario:senha@smtp.exemplo.com`) e, opcionalmente, `SMTP_DE`. Sem isso, em desenvolvimento o link aparece no console da API; em produção nada é enviado nem registrado.

Integração contínua: `.github/workflows/ci.yml` roda ESLint, Prettier e os testes a cada push.

## Requisitos atendidos

- RF01–RF02: cadastro, login e tela Minha Conta (ver, editar, trocar senha, excluir)
- RF03–RF09: cardápio do dia, montagem da marmita por tipo (preço próprio), carrinho, cupom, entrega/retirada, bairro e taxa
- RF07: entrega aceita só Pix ou cartão; dinheiro só na retirada (validado no front e na API)
- RF10: chat do pedido entre cliente e equipe
- RF11: Meus Pedidos (marmitas, valores, recebimento, status)
- RF12–RF13: gerente aceita ou recusa (mensagem pronta ou motivo livre) e muda o status (entrega: Preparando → Saiu para entrega → Entregue; retirada: Preparando → Pronto para retirada → Retirado)
- Preço da marmita: cada categoria tem N opções incluídas no preço do tipo (mínimo) e aceita até um total (máximo). Todo ingrediente tem um preço de adicional: escolhido como principal não custa nada; só o que passa do mínimo, pedido como adicional, é cobrado (ex.: ovo no lugar do bife é grátis; ovo principal + bife extra cobra só o bife)
- Extras (bebidas e sobremesas) ficam fora da marmita: o cliente adiciona no carrinho, em qualquer quantidade
- Telas do cliente (pedido e Meus Pedidos) e do gerente (pedidos, resumo) se atualizam sozinhas (consulta à API a cada 4–10 s)
- RF14–RF19: produtos, tipos (preço, categorias, produtos permitidos), cardápio do dia com caixas de seleção e publicação, bairros e taxas, cupons (ativar/desativar, condições)
- RNF10: login do gerente; RNF11: caixas de seleção; RNF12: API REST em JSON
- Pedidos só entram dentro do horário de funcionamento (ou agendados dentro dele); login com limite de tentativas; aceitar/recusar/mudar status protegidos contra dois gerentes ao mesmo tempo
- Cliente: tela Minha Conta com endereço salvo pelo CEP, acessibilidade (verificada com axe-core em todas as telas), "Pedir de novo", endereço e bairro pelo CEP (ViaCEP): a API procura o bairro na tabela de bairros, mostra a taxa ou recusa se não entregamos lá, carrinho que remove itens que saíram do cardápio, aviso do próximo cardápio quando o de hoje não foi publicado
- Métricas e relatório (gerente): pedidos, faturamento bruto, ticket médio, clientes ativos/novos/recorrentes por semana, quinzena ou mês, com médias, gráfico e CSV
- Cliente: cancelar pedido enquanto aguarda aceite, recuperar senha por link, Meus Pedidos com "carregar mais"; endereço, telefone, prazos e horário vêm da loja (editáveis em Configurações)
- Atualização em tempo real (SSE) nas telas de pedido, Meus Pedidos, pedidos do gerente e resumo
- Gerente: aviso sonoro e notificação de novo pedido, impressão de comanda, confirmação extra ao excluir tipo/produto/bairro em uso
- Não incluído: mapa/geolocalização do endereço (RF03 do documento geral)

Cada front declara suas páginas explicitamente no `server.js`; só `/css`, `/js` e `/img` são servidos como estáticos.
