-- ==============================================================================
-- CARACTERÍSTICA DE SISTEMA DE TEMAS GLOBALES
-- ==============================================================================

-- Agregar la columna 'theme' a la tabla 'tenants'. 
-- El valor por defecto es 'dark', que es el diseño actual del sistema.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS theme VARCHAR(50) DEFAULT 'dark';
