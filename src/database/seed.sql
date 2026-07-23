-- src/database/seed.sql
-- Dados de exemplo para testar o catálogo com o banco real.
-- Execute depois do schema.sql: psql -f src/database/seed.sql $DATABASE_URL

INSERT INTO categories (name, slug) VALUES
  ('Copos e Talheres', 'copos-e-talheres'),
  ('Limpeza', 'limpeza'),
  ('Pratos e Embalagens', 'pratos-e-embalagens'),
  ('Higiene', 'higiene')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
SELECT 'DC-1001', 'Copo Descartável 200ml (pacote c/ 100)',
  'Copos descartáveis translúcidos de 200ml, ideais para água, café e eventos. Material atóxico aprovado para contato com alimentos.',
  'CopoMax', 12.90, 340, id, true
FROM categories WHERE slug = 'copos-e-talheres'
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
SELECT 'DC-1002', 'Saco de Lixo Reforçado 100L (rolo c/ 10)',
  'Saco de lixo reforçado com solda lateral dupla, indicado para uso comercial e residencial pesado.',
  'EcoFort', 24.50, 180, id, true
FROM categories WHERE slug = 'limpeza'
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
SELECT 'DC-1003', 'Prato Descartável Raso 21cm (pacote c/ 50)',
  'Prato descartável de papel laminado, resistente a líquidos, ideal para festas e eventos corporativos.',
  'FestaBem', 9.90, 500, id, false
FROM categories WHERE slug = 'pratos-e-embalagens'
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
SELECT 'DC-1004', 'Luva Descartável Látex P (caixa c/ 100)',
  'Luvas de látex descartáveis, sem pó, indicadas para manipulação de alimentos e uso em limpeza.',
  'ProtegeMais', 32.00, 90, id, true
FROM categories WHERE slug = 'higiene'
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
SELECT 'DC-1005', 'Guardanapo de Papel Folha Dupla (pacote c/ 200)',
  'Guardanapos de papel folha dupla, macios e absorventes, embalagem econômica.',
  'MacioLar', 7.50, 620, id, false
FROM categories WHERE slug = 'higiene'
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
SELECT 'DC-1006', 'Embalagem Delivery Marmita 500ml (pacote c/ 50)',
  'Embalagem para marmita com tampa, própria para micro-ondas, ideal para delivery de refeições.',
  'DeliveryPack', 28.90, 210, id, false
FROM categories WHERE slug = 'pratos-e-embalagens'
ON CONFLICT (code) DO NOTHING;

INSERT INTO products (code, name, description, brand, price, stock, category_id, featured)
SELECT 'DC-1007', 'Copo Descartável 50ml Café (pacote c/ 100)',
  'Copo descartável pequeno para café e cafezinho, translúcido, resistente a líquidos quentes.',
  'CopoMax', 6.90, 15, id, false
FROM categories WHERE slug = 'copos-e-talheres'
ON CONFLICT (code) DO NOTHING;
