-- src/database/schema.sql
-- Schema PostgreSQL do projeto. Execute este arquivo no seu banco antes de
-- subir a aplicação (ex: psql -f src/database/schema.sql $DATABASE_URL).
--
-- Tabelas de produtos/categorias/imagens já estão definidas aqui para que
-- o Catálogo (Etapa 5) não exija uma segunda migração — mas o backend
-- desta etapa (Etapa 4) usa apenas users, password_reset_tokens e contacts.

CREATE TYPE user_role AS ENUM ('administrador', 'funcionario', 'cliente');

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(30),
  role user_role NOT NULL DEFAULT 'cliente',
  avatar_url VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Configurações gerais do site (chave/valor), editáveis pelo painel
-- administrativo: nome da loja, WhatsApp, e-mail de contato, redes sociais.
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

INSERT INTO settings (key, value) VALUES
  ('site_nome', 'DescarteCerto'),
  ('site_whatsapp', '5500000000000'),
  ('site_email', 'contato@descartecerto.com.br'),
  ('site_instagram', 'https://instagram.com'),
  ('site_facebook', 'https://facebook.com')
ON CONFLICT (key) DO NOTHING;

-- Configurações gerais do site (nome, contatos, redes sociais), editáveis
-- pelo painel administrativo. Modelo chave-valor simples, suficiente para
-- o volume de configurações previsto.
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT
);

INSERT INTO settings (key, value) VALUES
  ('site_nome', 'DescarteCerto'),
  ('site_whatsapp', '5500000000000'),
  ('site_email', 'contato@descartecerto.com.br'),
  ('site_instagram', 'https://instagram.com'),
  ('site_facebook', 'https://facebook.com')
ON CONFLICT (key) DO NOTHING;

-- Índices de apoio à performance de busca (usados a partir da Etapa 5)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_busca ON products USING gin (to_tsvector('portuguese', name));
