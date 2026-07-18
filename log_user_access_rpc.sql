-- Crear función RPC para registrar el login de forma atómica y segura
CREATE OR REPLACE FUNCTION public.log_user_access(p_action TEXT DEFAULT 'LOGIN')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Obtener el tenant_id del usuario actual
    SELECT tenant_id INTO v_tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
        -- 1. Insertar el log de acceso
        INSERT INTO public.user_access_logs (tenant_id, user_id, action)
        VALUES (v_tenant_id, auth.uid(), p_action);

        -- 2. Actualizar el perfil del usuario si es un LOGIN
        IF p_action = 'LOGIN' THEN
            UPDATE public.user_profiles 
            SET login_count = COALESCE(login_count, 0) + 1,
                last_login_at = NOW()
            WHERE id = auth.uid();
        END IF;
    END IF;
END;
$$;
