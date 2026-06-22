-- Función RPC para registrar una nueva empresa y vincular al usuario que la crea
-- Se ejecuta con SECURITY DEFINER para tener permisos elevados y saltarse temporalmente el RLS
-- porque el usuario no puede insertarse a sí mismo en user_profiles si aún no tiene un tenant_id asignado.

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
BEGIN
  -- 1. Obtener el ID del usuario autenticado que está llamando a la función
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 2. Verificar si el usuario ya tiene un perfil
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una empresa';
  END IF;

  -- 3. Crear el Tenant (Empresa)
  INSERT INTO public.tenants (name, nit, subscription_plan)
  VALUES (p_company_name, p_company_nit, 'BASIC')
  RETURNING id INTO v_tenant_id;

  -- 4. Crear la Sucursal Principal
  INSERT INTO public.branches (tenant_id, name, establishment_code, point_of_sale_code)
  VALUES (v_tenant_id, p_branch_name, '0001', '0001')
  RETURNING id INTO v_branch_id;

  -- 5. Crear el Perfil del Usuario como ADMIN de ese tenant
  INSERT INTO public.user_profiles (id, tenant_id, branch_id, role, first_name, last_name)
  VALUES (v_user_id, v_tenant_id, v_branch_id, 'ADMIN', p_first_name, p_last_name);

  -- 6. Devolver éxito
  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'branch_id', v_branch_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
