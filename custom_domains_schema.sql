-- Añadir la columna custom_domain a la tabla tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- Actualizar temporalmente el RLS (si es necesario) o las políticas para permitir que cualquiera pueda leer tenants por dominio personalizado.
-- Por seguridad, crearemos una función específica para obtener un tenant por su dominio sin exponer la tabla completa a usuarios anónimos.

CREATE OR REPLACE FUNCTION public.get_tenant_by_domain(p_domain TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant RECORD;
BEGIN
  SELECT id, name, logo_url, theme, custom_domain 
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
