CREATE TABLE IF NOT EXISTS gerentes (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clientes (
  id          SERIAL PRIMARY KEY,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  telefone    TEXT NOT NULL,
  senha_hash  TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bairros (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL UNIQUE,
  taxa_entrega  NUMERIC(8,2) NOT NULL CHECK (taxa_entrega >= 0),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS enderecos (
  cliente_id  INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  cep         TEXT,
  rua         TEXT NOT NULL,
  numero      TEXT NOT NULL,
  complemento TEXT,
  bairro_id   INTEGER REFERENCES bairros(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tipos_marmita (
  id         SERIAL PRIMARY KEY,
  nome       TEXT NOT NULL UNIQUE,
  descricao  TEXT,
  preco      NUMERIC(8,2) NOT NULL CHECK (preco >= 0),
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  ordem      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ingredientes (
  id           SERIAL PRIMARY KEY,
  nome         TEXT NOT NULL,
  categoria    TEXT NOT NULL CHECK (categoria IN ('carboidrato','proteina','acompanhamento','salada','extra')),
  preco_extra  NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (preco_extra >= 0),
  ativo        BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (nome, categoria)
);

CREATE TABLE IF NOT EXISTS tipo_categorias (
  tipo_id    INTEGER NOT NULL REFERENCES tipos_marmita(id) ON DELETE CASCADE,
  categoria  TEXT NOT NULL CHECK (categoria IN ('carboidrato','proteina','acompanhamento','salada')),
  ordem      INTEGER NOT NULL DEFAULT 0,
  minimo     INTEGER NOT NULL DEFAULT 1,
  maximo     INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tipo_id, categoria),
  CHECK (minimo >= 0 AND maximo >= minimo)
);

CREATE TABLE IF NOT EXISTS tipo_ingredientes (
  tipo_id         INTEGER NOT NULL REFERENCES tipos_marmita(id) ON DELETE CASCADE,
  ingrediente_id  INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  PRIMARY KEY (tipo_id, ingrediente_id)
);

CREATE TABLE IF NOT EXISTS cardapio_dia (
  data       DATE PRIMARY KEY,
  publicado  BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS cardapio_dia_tipos (
  data     DATE NOT NULL REFERENCES cardapio_dia(data) ON DELETE CASCADE,
  tipo_id  INTEGER NOT NULL REFERENCES tipos_marmita(id) ON DELETE CASCADE,
  PRIMARY KEY (data, tipo_id)
);

CREATE TABLE IF NOT EXISTS cardapio_dia_produtos (
  data            DATE NOT NULL REFERENCES cardapio_dia(data) ON DELETE CASCADE,
  ingrediente_id  INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  PRIMARY KEY (data, ingrediente_id)
);

CREATE TABLE IF NOT EXISTS cupons (
  codigo                  TEXT PRIMARY KEY,
  percentual              NUMERIC(5,2) NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  apenas_primeiro_pedido  BOOLEAN NOT NULL DEFAULT FALSE,
  valor_minimo            NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (valor_minimo >= 0),
  valido_ate              DATE,
  ativo                   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS mensagens_recusa (
  id     SERIAL PRIMARY KEY,
  texto  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS pedidos (
  id               SERIAL PRIMARY KEY,
  cliente_id       INTEGER REFERENCES clientes(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'Esperando'
                   CHECK (status IN ('Esperando','Preparando','Saiu para Entrega','Pronto para Retirada','Concluído','Cancelado')),
  tipo_entrega     TEXT NOT NULL CHECK (tipo_entrega IN ('entrega','retirada')),
  nome_cliente     TEXT NOT NULL,
  telefone         TEXT NOT NULL,
  cep              TEXT,
  rua              TEXT,
  numero           TEXT,
  complemento      TEXT,
  bairro_id        INTEGER REFERENCES bairros(id) ON DELETE SET NULL,
  bairro_nome      TEXT,
  forma_pagamento  TEXT NOT NULL CHECK (forma_pagamento IN ('pix','cartao','dinheiro')),
  troco_para       NUMERIC(8,2),
  horario_agendado TIME,
  observacoes      TEXT,
  cupom            TEXT,
  subtotal         NUMERIC(8,2) NOT NULL,
  adicionais       NUMERIC(8,2) NOT NULL DEFAULT 0,
  desconto         NUMERIC(8,2) NOT NULL DEFAULT 0,
  taxa_entrega     NUMERIC(8,2) NOT NULL DEFAULT 0,
  total            NUMERIC(8,2) NOT NULL,
  motivo_recusa    TEXT,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (tipo_entrega = 'retirada' OR forma_pagamento IN ('pix','cartao'))
);
CREATE INDEX IF NOT EXISTS pedidos_cliente_idx ON pedidos (cliente_id, criado_em DESC);
CREATE INDEX IF NOT EXISTS pedidos_status_idx ON pedidos (status, criado_em DESC);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id              SERIAL PRIMARY KEY,
  pedido_id       INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo_id         INTEGER REFERENCES tipos_marmita(id) ON DELETE SET NULL,
  tipo_nome       TEXT NOT NULL,
  extra           BOOLEAN NOT NULL DEFAULT FALSE,
  produto_id      INTEGER REFERENCES ingredientes(id) ON DELETE SET NULL,
  quantidade      INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario  NUMERIC(8,2) NOT NULL,
  observacoes     TEXT
);

CREATE TABLE IF NOT EXISTS pedido_item_ingredientes (
  item_id         INTEGER NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  ingrediente_id  INTEGER REFERENCES ingredientes(id) ON DELETE SET NULL,
  nome            TEXT NOT NULL,
  categoria       TEXT NOT NULL,
  preco_extra     NUMERIC(8,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS mensagens (
  id         SERIAL PRIMARY KEY,
  pedido_id  INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  autor      TEXT NOT NULL CHECK (autor IN ('cliente','equipe')),
  texto      TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mensagens_pedido_idx ON mensagens (pedido_id, id);

ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS produto_id INTEGER REFERENCES ingredientes(id) ON DELETE SET NULL;
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_status_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_status_check
  CHECK (status IN ('Esperando','Preparando','Saiu para Entrega','Pronto para Retirada','Concluído','Cancelado'));

ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cancelado_por TEXT CHECK (cancelado_por IN ('cliente','equipe'));

CREATE TABLE IF NOT EXISTS loja_config (
  chave  TEXT PRIMARY KEY,
  valor  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recuperacoes_senha (
  id          SERIAL PRIMARY KEY,
  cliente_id  INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expira_em   TIMESTAMPTZ NOT NULL
);
