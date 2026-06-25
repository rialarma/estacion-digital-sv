-- Actualizar la función RPC para soportar edición completa de empleados
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_pin TEXT DEFAULT NULL,
  p_shift_start TIME DEFAULT NULL,
  p_shift_end TIME DEFAULT NULL,
  p_saturday_shift_start TIME DEFAULT NULL,
  p_saturday_shift_end TIME DEFAULT NULL,
  p_sunday_shift_start TIME DEFAULT NULL,
  p_sunday_shift_end TIME DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_tenant UUID;
    v_target_tenant UUID;
BEGIN
    -- 1. Obtener perfil del que llama
    SELECT role, tenant_id INTO v_caller_role, v_caller_tenant 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    
    IF v_caller_role != 'ADMIN' AND v_caller_role != 'GERENTE' THEN
        RAISE EXCEPTION 'No tienes permisos para editar usuarios.';
    END IF;

    -- 2. Obtener perfil del objetivo
    SELECT tenant_id INTO v_target_tenant 
    FROM public.user_profiles 
    WHERE id = p_user_id;
    
    IF v_caller_tenant != v_target_tenant THEN
        RAISE EXCEPTION 'El usuario no pertenece a su empresa.';
    END IF;

    -- 3. Actualizar los datos (Ojo: NO se cambia el username ni el rol desde aquí)
    UPDATE public.user_profiles
    SET 
      first_name = p_first_name, 
      last_name = p_last_name,
      pin = p_pin,
      shift_start = p_shift_start,
      shift_end = p_shift_end,
      saturday_shift_start = p_saturday_shift_start,
      saturday_shift_end = p_saturday_shift_end,
      sunday_shift_start = p_sunday_shift_start,
      sunday_shift_end = p_sunday_shift_end
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;
