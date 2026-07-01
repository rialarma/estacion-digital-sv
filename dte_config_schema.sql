-- Añadir configuración de Facturación Electrónica (MH) a la tabla de Tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS dte_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dte_environment TEXT DEFAULT 'TEST',
ADD COLUMN IF NOT EXISTS dte_password_api TEXT,
ADD COLUMN IF NOT EXISTS dte_username_api TEXT;

-- Refrescar caché de PostgREST para que la API reconozca las nuevas columnas
NOTIFY pgrst, 'reload schema';
