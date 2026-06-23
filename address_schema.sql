-- Añadir campos geográficos a tenants (Empresa)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS department_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS municipality_code TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS address TEXT;

-- Añadir campos geográficos a branches (Sucursales)
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS department_code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS municipality_code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS district TEXT;
-- NOTA: el campo address ya existe en branches.
