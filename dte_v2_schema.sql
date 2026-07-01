-- 1. Habilitar extensión pgcrypto para encriptación
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Cambiar la columna de contraseña a binaria para soportar encriptación segura
-- (Asumimos que apenas se creó y está vacía, así que el cast directo no es problema)
ALTER TABLE public.tenants
  ALTER COLUMN dte_password_api TYPE BYTEA USING (dte_password_api::bytea);

-- 3. Crear RPC para guardar de forma segura las credenciales (encriptadas)
CREATE OR REPLACE FUNCTION public.save_dte_credentials(
  p_tenant_id UUID,
  p_enabled BOOLEAN,
  p_environment TEXT,
  p_username TEXT,
  p_password TEXT -- Contraseña en texto plano temporal
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_tenant UUID;
BEGIN
    -- 1. Obtener perfil del que llama (verificar permisos)
    SELECT role, tenant_id INTO v_caller_role, v_caller_tenant 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    
    IF v_caller_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Solo los administradores pueden configurar DTE.';
    END IF;

    IF v_caller_tenant != p_tenant_id THEN
        RAISE EXCEPTION 'No tienes permiso para modificar esta empresa.';
    END IF;

    -- 2. Actualizar configuración. Solo encriptar contraseña si fue proporcionada.
    IF p_password IS NOT NULL AND p_password != '' THEN
        UPDATE public.tenants 
        SET 
            dte_enabled = p_enabled,
            dte_environment = p_environment,
            dte_username_api = p_username,
            dte_password_api = PGP_SYM_ENCRYPT(p_password, COALESCE(current_setting('app.settings.dte_secret_key', true), 'default_secret_key_change_me'))
        WHERE id = p_tenant_id;
    ELSE
        -- Si no mandan contraseña nueva, actualizar lo demás sin tocar la contraseña actual
        UPDATE public.tenants 
        SET 
            dte_enabled = p_enabled,
            dte_environment = p_environment,
            dte_username_api = p_username
        WHERE id = p_tenant_id;
    END IF;

    RETURN TRUE;
END;
$$;


-- 4. Añadir campos de control de documentos a las Sucursales
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS dte_resolution_number TEXT,
ADD COLUMN IF NOT EXISTS dte_series TEXT,
ADD COLUMN IF NOT EXISTS dte_correlative_fcf INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS dte_correlative_ccf INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS dte_correlative_fex INTEGER DEFAULT 1;

NOTIFY pgrst, 'reload schema';
