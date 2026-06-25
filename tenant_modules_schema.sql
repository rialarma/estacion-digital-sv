-- ==============================================================================
-- MÓDULOS SAAS (SOFTWARE COMO SERVICIO)
-- ==============================================================================

-- 1. Agregar banderas (flags) booleanas a la tabla de inquilinos (tenants)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS module_inventory BOOLEAN DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS module_accounting BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS module_memberships BOOLEAN DEFAULT false;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS module_logistics BOOLEAN DEFAULT false;

-- 2. Asegurarnos de que las columnas tengan valores por defecto seguros para inquilinos existentes
UPDATE public.tenants SET module_inventory = true WHERE module_inventory IS NULL;
UPDATE public.tenants SET module_accounting = true WHERE module_accounting IS NULL; -- Les damos todo temporalmente a los actuales si quieres
UPDATE public.tenants SET module_memberships = true WHERE module_memberships IS NULL;
UPDATE public.tenants SET module_logistics = true WHERE module_logistics IS NULL;

-- 3. Refrescar la caché para que la API de Supabase y React vean los nuevos campos
NOTIFY pgrst, 'reload schema';
