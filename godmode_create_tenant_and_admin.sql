CREATE OR REPLACE FUNCTION public.godmode_create_tenant_and_admin(
  p_company_name TEXT,
  p_company_nit TEXT,
  p_prefix TEXT,
  p_admin_id UUID,
  p_admin_first_name TEXT,
  p_admin_last_name TEXT,
  p_admin_username TEXT,
  p_whatsapp_number TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_branch_id UUID;
  v_safe_prefix TEXT;
  v_invite_code TEXT;
  v_result JSONB;
BEGIN
  -- Verificar permisos (God Mode)
  IF auth.jwt() ->> 'email' NOT IN ('raam2508@gmail.com', 'admin@estaciondigital.sv') THEN
    RAISE EXCEPTION 'No autorizado. Solo Super Admin puede crear empresas.';
  END IF;

  -- Generar prefijo seguro y único
  v_safe_prefix := lower(regexp_replace(p_prefix, '[^a-zA-Z0-9]', '', 'g'));
  IF EXISTS (SELECT 1 FROM public.tenants WHERE tenant_prefix = v_safe_prefix) THEN
    RAISE EXCEPTION 'El prefijo "%" ya está en uso. Por favor, elige otro.', v_safe_prefix;
  END IF;

  -- Generar código de invitación aleatorio
  v_invite_code := encode(gen_random_bytes(6), 'hex');

  -- 1. Insertar el Tenant
  INSERT INTO public.tenants (name, nit, subscription_plan, tenant_prefix, invite_code, subscription_status, whatsapp_number)
  VALUES (p_company_name, p_company_nit, 'BASIC', v_safe_prefix, v_invite_code, 'ACTIVE', p_whatsapp_number)
  RETURNING id INTO v_tenant_id;

  -- 2. Crear Sucursal Principal (Casa Matriz)
  INSERT INTO public.branches (tenant_id, name)
  VALUES (v_tenant_id, 'Casa Matriz')
  RETURNING id INTO v_branch_id;

  -- 3. Insertar el Perfil del Dueño (Admin) vinculado al Tenant y a la Sucursal Principal
  INSERT INTO public.user_profiles (id, tenant_id, branch_id, role, first_name, last_name, username)
  VALUES (p_admin_id, v_tenant_id, v_branch_id, 'ADMIN', p_admin_first_name, p_admin_last_name, p_admin_username);

  -- 4. Crear las configuraciones por defecto del tenant (opcional, expandible)
  -- INSERT INTO public.catalogo_cuentas (tenant_id, code, name, type) VALUES ...

  -- 5. Crear el Cliente Genérico por defecto (Consumidor Final)
  INSERT INTO public.clients (
    tenant_id,
    name,
    document_type,
    document_number,
    department_code,
    municipality_code,
    district,
    address,
    credit_limit,
    points_balance
  ) VALUES (
    v_tenant_id,
    'Consumidor Final',
    'DUI',
    '00000000-0',
    '12',
    'San Miguel Centro',
    'San Miguel',
    'San Miguel',
    0,
    0
  );

  -- Preparar resultado
  v_result := jsonb_build_object(
    'tenant_id', v_tenant_id,
    'branch_id', v_branch_id,
    'tenant_prefix', v_safe_prefix,
    'invite_code', v_invite_code
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
