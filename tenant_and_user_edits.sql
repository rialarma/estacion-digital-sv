-- ==============================================================================
-- ACTUALIZACIÓN DE PREFIJO Y EDICIÓN DE USUARIOS
-- ==============================================================================

-- 1. Extensión necesaria para encriptar la contraseña (Suele estar activa por defecto en Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Agregar la columna tenant_prefix a la tabla de tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tenant_prefix VARCHAR(10) DEFAULT 'emp';

-- 3. RPC para editar Nombre y Apellido de un Empleado
CREATE OR REPLACE FUNCTION public.admin_update_user_profile(
  p_user_id UUID,
  p_first_name TEXT,
  p_last_name TEXT
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

    -- 3. Actualizar los datos (Ojo: NO se cambia el username)
    UPDATE public.user_profiles
    SET first_name = p_first_name, last_name = p_last_name
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

-- 4. RPC para Resetear la Contraseña de un Empleado
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
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
        RAISE EXCEPTION 'Solo administradores o gerentes pueden resetear claves.';
    END IF;

    -- 2. Obtener perfil del objetivo
    SELECT tenant_id INTO v_target_tenant 
    FROM public.user_profiles 
    WHERE id = p_user_id;
    
    IF v_caller_tenant != v_target_tenant THEN
        RAISE EXCEPTION 'El usuario no pertenece a su empresa.';
    END IF;

    -- 3. Actualizar la contraseña usando bcrypt (algoritmo usado por Supabase Auth)
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;
