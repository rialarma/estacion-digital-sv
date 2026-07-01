-- Script para agregar color de texto a los Tenants
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS store_primary_text_color TEXT DEFAULT '#ffffff';
