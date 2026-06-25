-- ==============================================================================
-- MIGRACIÓN DE VENDEDORES A USUARIOS
-- ==============================================================================

-- 1. Agregar el rol VENDEDOR a user_profiles
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check 
CHECK (role IN ('ADMIN', 'GERENTE', 'CAJERO', 'BODEGUERO', 'VENDEDOR'));

-- 2. Cambiar FK en Sales para apuntar a user_profiles en lugar de sellers
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_seller_id_fkey;
ALTER TABLE public.sales ADD CONSTRAINT sales_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 3. Cambiar FK en Quotes para apuntar a user_profiles en lugar de sellers
ALTER TABLE public.quotes DROP CONSTRAINT IF EXISTS quotes_seller_id_fkey;
ALTER TABLE public.quotes ADD CONSTRAINT quotes_seller_id_fkey 
FOREIGN KEY (seller_id) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 4. Crear el RPC para que el ADMIN pueda registrar perfiles directamente
CREATE OR REPLACE FUNCTION public.admin_create_user_profile(
  p_user_id UUID,
  p_role TEXT,
  p_first_name TEXT,
  p_last_name TEXT
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
    INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name)
    VALUES (p_user_id, v_tenant_id, p_role, p_first_name, p_last_name);

    RETURN TRUE;
END;
$$;
