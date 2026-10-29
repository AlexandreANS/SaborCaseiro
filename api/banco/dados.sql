INSERT INTO bairros (nome, taxa_entrega) VALUES
  ('Bela Vista', 5.00), ('Consolação', 6.00), ('Liberdade', 6.00),
  ('Paraíso', 7.00), ('Jardins', 8.00), ('Vila Mariana', 9.00);

INSERT INTO cupons (codigo, percentual, apenas_primeiro_pedido) VALUES ('SABORCASEIRO10', 10, TRUE);

INSERT INTO mensagens_recusa (texto) VALUES
  ('Não conseguimos atender o seu pedido neste horário.'),
  ('Estamos sem um dos ingredientes escolhidos. Faça um novo pedido, por favor.'),
  ('Não entregamos no endereço informado.');

INSERT INTO tipos_marmita (nome, descricao, preco, ordem) VALUES
  ('Marmita Infantil', 'Porções e temperos pensados para crianças.', 18, 1),
  ('Marmita do Dia',   'O combo tradicional da casa, sempre fresquinho.', 24, 2),
  ('Marmita Fit',      'Carboidratos integrais e proteínas magras.', 26, 3),
  ('Marmita 2 Carnes', 'Para quem não abre mão de duas proteínas no prato.', 32, 4),
  ('Marmita Familiar', 'Porção grande para dividir, ideal para 2 a 3 pessoas.', 49, 5);

INSERT INTO ingredientes (nome, categoria, preco_extra) VALUES
  ('Arroz Branco','carboidrato',0), ('Arroz Integral','carboidrato',0),
  ('Macarrão com Alho e Óleo','carboidrato',0), ('Purê de Batata','carboidrato',0),
  ('Farofa da Casa','carboidrato',0), ('Mandioca Cozida','carboidrato',0),
  ('Batata-doce Assada','carboidrato',0),
  ('Frango Grelhado','proteina',0), ('Bife Acebolado','proteina',5),
  ('Linguiça Calabresa','proteina',3), ('Ovo Frito','proteina',2),
  ('Carne Moída','proteina',4), ('Peixe Grelhado','proteina',6),
  ('Coxa de Frango Assada','proteina',0),
  ('Feijão Carioca','acompanhamento',0), ('Feijão Preto','acompanhamento',0),
  ('Vinagrete Fresco','acompanhamento',0), ('Farofa Temperada','acompanhamento',0),
  ('Legumes Salteados','acompanhamento',0),
  ('Alface Americana','salada',0), ('Tomate Fresco','salada',0),
  ('Cenoura Ralada','salada',0), ('Beterraba Cozida','salada',0),
  ('Repolho Branco','salada',0),
  ('Refrigerante Lata (350ml)','extra',5), ('Suco Natural de Laranja','extra',7),
  ('Água Mineral sem Gás','extra',3), ('Água Mineral com Gás','extra',3.5),
  ('Pudim de Leite Condensado','extra',6);

INSERT INTO tipo_categorias (tipo_id, categoria, ordem, minimo, maximo)
SELECT t.id, c.categoria, c.ordem,
       CASE WHEN c.categoria = 'proteina' AND t.nome = 'Marmita 2 Carnes' THEN 2 ELSE c.minimo END,
       CASE WHEN c.categoria = 'proteina' AND t.nome = 'Marmita 2 Carnes' THEN 2
            WHEN c.categoria = 'carboidrato' AND t.nome = 'Marmita Fit' THEN 1 ELSE c.maximo END
FROM tipos_marmita t
CROSS JOIN (VALUES
  ('carboidrato',1,1,2), ('proteina',2,1,1), ('acompanhamento',3,1,1),
  ('salada',4,1,1)
) AS c(categoria, ordem, minimo, maximo);

INSERT INTO tipo_ingredientes (tipo_id, ingrediente_id)
SELECT t.id, i.id FROM tipos_marmita t, ingredientes i
WHERE i.categoria <> 'extra' AND (
  t.nome IN ('Marmita do Dia','Marmita 2 Carnes','Marmita Familiar')
  OR (t.nome = 'Marmita Fit' AND (i.categoria = 'salada' OR i.nome IN
      ('Arroz Integral','Mandioca Cozida','Batata-doce Assada',
       'Frango Grelhado','Peixe Grelhado','Ovo Frito',
       'Feijão Carioca','Legumes Salteados','Vinagrete Fresco')))
  OR (t.nome = 'Marmita Infantil' AND i.nome IN
      ('Arroz Branco','Macarrão com Alho e Óleo','Purê de Batata',
       'Frango Grelhado','Carne Moída','Ovo Frito',
       'Feijão Carioca','Farofa Temperada',
       'Alface Americana','Cenoura Ralada','Tomate Fresco'))
);

INSERT INTO cardapio_dia (data, publicado) VALUES ((now() AT TIME ZONE 'America/Sao_Paulo')::date, TRUE);
INSERT INTO cardapio_dia_tipos (data, tipo_id)
SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date, id FROM tipos_marmita;
INSERT INTO cardapio_dia_produtos (data, ingrediente_id)
SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date, id FROM ingredientes;
