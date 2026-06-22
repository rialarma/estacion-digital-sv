-- 1. Añadir columna a tenants si no existe
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Modificar la función register_tenant para que genere el invite_code al registrar
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

  INSERT INTO public.tenants (name, nit, subscription_plan, invite_code)
  VALUES (p_company_name, p_company_nit, 'BASIC', v_invite_code)
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

-- 3. Crear RPC para Unirse a un Tenant
CREATE OR REPLACE FUNCTION public.join_tenant_by_code(
  p_invite_code TEXT,
  p_first_name TEXT,
  p_last_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;

    SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid()) INTO v_profile_exists;
    IF v_profile_exists THEN RAISE EXCEPTION 'El usuario ya pertenece a una empresa.'; END IF;

    SELECT id INTO v_tenant_id FROM public.tenants WHERE invite_code = p_invite_code LIMIT 1;
    IF v_tenant_id IS NULL THEN RAISE EXCEPTION 'Código de invitación inválido o expirado.'; END IF;

    INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name)
    VALUES (auth.uid(), v_tenant_id, 'CAJERO', p_first_name, p_last_name);

    RETURN jsonb_build_object('success', true, 'tenant_id', v_tenant_id);
END;
$$;

-- 4. Crear RPC para Cambiar Rol (Solo Admins)
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_new_branch UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_tenant UUID;
    v_target_tenant UUID;
BEGIN
    SELECT role, tenant_id INTO v_caller_role, v_caller_tenant FROM public.user_profiles WHERE id = auth.uid();
    IF v_caller_role != 'ADMIN' THEN RAISE EXCEPTION 'Solo los administradores pueden cambiar roles.'; END IF;

    SELECT tenant_id INTO v_target_tenant FROM public.user_profiles WHERE id = p_user_id;
    IF v_caller_tenant != v_target_tenant THEN RAISE EXCEPTION 'El usuario no pertenece a su empresa.'; END IF;

    UPDATE public.user_profiles SET role = p_new_role, branch_id = p_new_branch WHERE id = p_user_id;
    RETURN TRUE;
END;
$$;

-- 5. Crear RPC para Regenerar Código de Invitación
CREATE OR REPLACE FUNCTION public.regenerate_invite_code() RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_tenant_id UUID;
    v_new_code TEXT;
BEGIN
    SELECT role, tenant_id INTO v_caller_role, v_tenant_id FROM public.user_profiles WHERE id = auth.uid();
    IF v_caller_role != 'ADMIN' THEN RAISE EXCEPTION 'Solo administradores pueden regenerar el código.'; END IF;

    v_new_code := substring(md5(random()::text), 1, 6);
    UPDATE public.tenants SET invite_code = v_new_code WHERE id = v_tenant_id;
    
    RETURN v_new_code;
END;
$$;

-- 6. Generar código a los tenants existentes que no lo tengan
UPDATE public.tenants SET invite_code = substring(md5(random()::text), 1, 6) WHERE invite_code IS NULL;
