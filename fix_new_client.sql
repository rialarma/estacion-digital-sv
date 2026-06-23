CREATE OR REPLACE FUNCTION public.register_tenant(
  p_company_name TEXT,
  p_company_nit TEXT,
  p_branch_name TEXT,
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_branch_id UUID;
  v_result JSONB;
  v_invite_code TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Usuario no autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_user_id) THEN RAISE EXCEPTION 'El usuario ya pertenece a una empresa'; END IF;

  v_invite_code := substring(md5(random()::text), 1, 6);

  -- INSERCIÓN EXPLÍCITA DE ACTIVE PARA QUE LOS CLIENTES NUEVOS ENTREN DIRECTO
  INSERT INTO public.tenants (name, nit, subscription_plan, subscription_status, invite_code)
  VALUES (p_company_name, p_company_nit, 'BASIC', 'ACTIVE', v_invite_code)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.branches (tenant_id, name, establishment_code, point_of_sale_code)
  VALUES (v_tenant_id, p_branch_name, '0001', '0001')
  RETURNING id INTO v_branch_id;

  INSERT INTO public.user_profiles (id, tenant_id, branch_id, role, first_name, last_name)
  VALUES (v_user_id, v_tenant_id, v_branch_id, 'ADMIN', p_first_name, p_last_name);

  v_result := jsonb_build_object('success', true, 'tenant_id', v_tenant_id, 'branch_id', v_branch_id);
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
