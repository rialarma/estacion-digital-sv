-- Añadir configuración de cabecera de ticket a la tabla tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS ticket_header TEXT DEFAULT '';
