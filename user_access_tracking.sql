-- 1. Agregar columnas a user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 2. Crear tabla de logs
CREATE TABLE IF NOT EXISTS public.user_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('LOGIN', 'LOGOUT')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;

-- 4. Crear Políticas de Seguridad
CREATE POLICY "Tenants can view own user_access_logs" ON public.user_access_logs FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert own user_access_logs" ON public.user_access_logs FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
