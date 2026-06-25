-- 1. Añadir columnas de redes sociales y contacto a la tabla tenants
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS about_us TEXT;

-- 2. Actualizar la función de RPC get_tenant_by_domain para que retorne también las nuevas columnas
CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(p_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant RECORD;
BEGIN
  SELECT id, name, logo_url, theme, custom_domain, whatsapp_number, facebook_url, instagram_url, about_us
  INTO v_tenant
  FROM public.tenants
  WHERE custom_domain = p_domain
  LIMIT 1;

  IF FOUND THEN
    RETURN row_to_json(v_tenant)::JSONB;
  ELSE
    RETURN NULL;
  END IF;
END;
$$;
