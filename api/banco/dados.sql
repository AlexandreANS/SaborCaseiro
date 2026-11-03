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
  ('Arroz Branco','carboidrato',2), ('Arroz Integral','carboidrato',2.5),
  ('Macarrão com Alho e Óleo','carboidrato',3), ('Purê de Batata','carboidrato',3),
  ('Farofa da Casa','carboidrato',2), ('Mandioca Cozida','carboidrato',3),
  ('Batata-doce Assada','carboidrato',3.5),
  ('Frango Grelhado','proteina',5), ('Bife Acebolado','proteina',8),
  ('Linguiça Calabresa','proteina',5), ('Ovo Frito','proteina',3),
  ('Carne Moída','proteina',6), ('Peixe Grelhado','proteina',9),
  ('Coxa de Frango Assada','proteina',5),
  ('Feijão Carioca','acompanhamento',2.5), ('Feijão Preto','acompanhamento',2.5),
  ('Vinagrete Fresco','acompanhamento',2), ('Farofa Temperada','acompanhamento',2),
  ('Legumes Salteados','acompanhamento',3),
  ('Alface Americana','salada',1.5), ('Tomate Fresco','salada',1.5),
  ('Cenoura Ralada','salada',1.5), ('Beterraba Cozida','salada',2),
  ('Repolho Branco','salada',1.5),
  ('Refrigerante Lata (350ml)','extra',5), ('Suco Natural de Laranja','extra',7),
  ('Água Mineral sem Gás','extra',3), ('Água Mineral com Gás','extra',3.5),
  ('Pudim de Leite Condensado','extra',6);

INSERT INTO tipo_categorias (tipo_id, categoria, ordem, minimo, maximo)
SELECT t.id, c.categoria, c.ordem,
       CASE WHEN c.categoria = 'proteina' AND t.nome = 'Marmita 2 Carnes' THEN 2 ELSE 1 END,
       CASE WHEN c.categoria = 'proteina' AND t.nome = 'Marmita 2 Carnes' THEN 5 ELSE 4 END
FROM tipos_marmita t
CROSS JOIN (VALUES
  ('carboidrato',1), ('proteina',2), ('acompanhamento',3), ('salada',4)
) AS c(categoria, ordem);

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
