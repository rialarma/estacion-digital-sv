-- ==============================================================================
-- CONTROL GRANULAR DE PÁGINAS PARA GOD MODE
-- ==============================================================================

-- 1. Agregar columna JSONB a la tabla de inquilinos (tenants)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS active_pages JSONB DEFAULT '{}'::jsonb;

-- 2. Asegurarnos de que las columnas tengan valores por defecto para inquilinos existentes
UPDATE public.tenants SET active_pages = '{}'::jsonb WHERE active_pages IS NULL;

-- 3. Refrescar la caché para que la API de Supabase vea los nuevos campos
NOTIFY pgrst, 'reload schema';
