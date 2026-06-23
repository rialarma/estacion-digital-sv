-- Añadir columna nrc y campos territoriales a la tabla clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nrc TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS department_code TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS municipality_code TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS district TEXT;
