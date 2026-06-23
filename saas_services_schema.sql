-- 1. Añadir flag de servicio a productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_service BOOLEAN DEFAULT false;

-- 2. Añadir estado de suscripción a los inquilinos
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'ACTIVE';
