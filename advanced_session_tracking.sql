-- 1. Crear tabla de sesiones
CREATE TABLE IF NOT EXISTS public.user_sessions_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    last_ping_time TIMESTAMPTZ DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    ip_address TEXT,
    user_agent TEXT
);

-- 2. Habilitar RLS
ALTER TABLE public.user_sessions_log ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad
CREATE POLICY "Tenants can view own user_sessions_log" ON public.user_sessions_log FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert own user_sessions_log" ON public.user_sessions_log FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can update own user_sessions_log" ON public.user_sessions_log FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- 4. RPC para iniciar sesión y devolver el ID
CREATE OR REPLACE FUNCTION public.start_session_log(
    p_latitude NUMERIC DEFAULT NULL, 
    p_longitude NUMERIC DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_session_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO public.user_sessions_log (tenant_id, user_id, latitude, longitude, user_agent)
        VALUES (v_tenant_id, auth.uid(), p_latitude, p_longitude, p_user_agent)
        RETURNING id INTO v_session_id;

        -- Update also the user_profiles basic stats
        UPDATE public.user_profiles 
        SET login_count = COALESCE(login_count, 0) + 1,
            last_login_at = NOW()
        WHERE id = auth.uid();

        RETURN v_session_id;
    END IF;
    
    RETURN NULL;
END;
$$;

-- 5. RPC para el heartbeat (ping)
CREATE OR REPLACE FUNCTION public.update_session_ping(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_sessions_log
    SET last_ping_time = NOW()
    WHERE id = p_session_id AND user_id = auth.uid();
END;
$$;

-- 6. RPC para logout explícito
CREATE OR REPLACE FUNCTION public.end_session_log(p_session_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_sessions_log
    SET logout_time = NOW(), last_ping_time = NOW()
    WHERE id = p_session_id AND user_id = auth.uid();
END;
$$;
