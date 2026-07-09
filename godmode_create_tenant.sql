CREATE OR REPLACE FUNCTION public.godmode_create_tenant(
  p_company_name TEXT,
  p_company_nit TEXT,
  p_branch_name TEXT,
  p_company_prefix TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_tenant_id UUID;
  v_branch_id UUID;
  v_safe_prefix TEXT;
  v_invite_code TEXT;
BEGIN
  -- Generar prefijo seguro
  v_safe_prefix := regexp_replace(lower(p_company_prefix), '[^a-z0-9]', '', 'g');
  IF length(v_safe_prefix) = 0 THEN
    v_safe_prefix := 'emp';
  END IF;

  -- Crear el Tenant con el prefijo
  INSERT INTO public.tenants (name, nit, subscription_plan, tenant_prefix)
  VALUES (p_company_name, p_company_nit, 'BASIC', v_safe_prefix)
  RETURNING id, invite_code INTO v_tenant_id, v_invite_code;

  -- Crear la Sucursal Principal
  INSERT INTO public.branches (tenant_id, name, establishment_code, point_of_sale_code)
  VALUES (v_tenant_id, p_branch_name, '0001', '0001')
  RETURNING id INTO v_branch_id;

  RETURN v_invite_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
