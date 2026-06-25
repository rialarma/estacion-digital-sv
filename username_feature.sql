-- ==============================================================================
-- CARACTERÍSTICA DE INICIO DE SESIÓN POR USUARIO
-- ==============================================================================

-- 1. Agregar columna username a user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- 2. Actualizar el RPC para que el ADMIN pueda registrar perfiles con username
CREATE OR REPLACE FUNCTION public.admin_create_user_profile(
  p_user_id UUID,
  p_role TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_username TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_tenant_id UUID;
BEGIN
    -- 1. Verificar si quien llama es ADMIN o GERENTE
    SELECT role, tenant_id INTO v_caller_role, v_tenant_id 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    
    IF v_caller_role != 'ADMIN' AND v_caller_role != 'GERENTE' THEN
        RAISE EXCEPTION 'No tienes permisos para crear usuarios.';
    END IF;

    -- 2. Insertar el perfil del usuario asegurando que pertenezca al mismo tenant
    INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name, username)
    VALUES (p_user_id, v_tenant_id, p_role, p_first_name, p_last_name, p_username);

    RETURN TRUE;
END;
$$;

-- 3. Crear RPC para obtener el email basado en el username (Se usa en Auth.jsx)
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT u.email INTO v_email
    FROM auth.users u
    JOIN public.user_profiles p ON u.id = p.id
    WHERE p.username = p_username
    LIMIT 1;
    
    RETURN v_email;
END;
$$;
