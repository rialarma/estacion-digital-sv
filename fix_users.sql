CREATE OR REPLACE FUNCTION public.admin_update_user_profile_v2(
  p_user_id UUID,
  p_role TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_tenant UUID;
    v_target_tenant UUID;
BEGIN
    SELECT role, tenant_id INTO v_caller_role, v_caller_tenant 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    
    IF v_caller_role != 'ADMIN' AND v_caller_role != 'GERENTE' THEN
        RAISE EXCEPTION 'No tienes permisos para editar usuarios.';
    END IF;

    SELECT tenant_id INTO v_target_tenant 
    FROM public.user_profiles 
    WHERE id = p_user_id;
    
    IF v_caller_tenant != v_target_tenant THEN
        RAISE EXCEPTION 'El usuario no pertenece a su empresa.';
    END IF;

    UPDATE public.user_profiles
    SET 
      first_name = p_first_name, 
      last_name = p_last_name,
      role = p_role,
      pin = p_pin
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_user_profile_v2(
  p_user_id UUID,
  p_role TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_username TEXT,
  p_pin TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_tenant_id UUID;
BEGIN
    SELECT role, tenant_id INTO v_caller_role, v_tenant_id 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    
    IF v_caller_role != 'ADMIN' AND v_caller_role != 'GERENTE' THEN
        RAISE EXCEPTION 'No tienes permisos para crear usuarios.';
    END IF;

    INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name, username, pin)
    VALUES (p_user_id, v_tenant_id, p_role, p_first_name, p_last_name, p_username, p_pin);

    RETURN TRUE;
END;
$$;
