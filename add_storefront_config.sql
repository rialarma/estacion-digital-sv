-- SQL para ejecutar en el panel de SQL Editor de Supabase
ALTER TABLE tenants
ADD COLUMN primary_color TEXT DEFAULT '#0f172a',
ADD COLUMN hero_banner_url TEXT,
ADD COLUMN store_slogan TEXT;
