-- Agregar la columna 'module_hr' a la tabla 'tenants'. 
-- Permitirá habilitar o deshabilitar el módulo de Recursos Humanos desde God Mode.
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS module_hr BOOLEAN DEFAULT true;
