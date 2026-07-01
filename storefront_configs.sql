-- Script para agregar configuraciones avanzadas de Tienda Virtual a los Tenants
-- Debes ejecutar este script en el SQL Editor de Supabase

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS store_promo_message TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS store_catalog_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS store_button_text TEXT DEFAULT 'AÑADIR AL CARRITO',
ADD COLUMN IF NOT EXISTS store_shipping_cost NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS store_show_whatsapp_float BOOLEAN DEFAULT TRUE;
