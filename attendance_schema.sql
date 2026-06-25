-- ==============================================================================
-- MÓDULO DE CONTROL DE ASISTENCIA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.employee_attendance;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.employee_attendance;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.employee_attendance;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.employee_attendance;

CREATE POLICY "Tenant Isolation Select" ON public.employee_attendance FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert" ON public.employee_attendance FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update" ON public.employee_attendance FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete" ON public.employee_attendance FOR DELETE USING (tenant_id = public.get_auth_tenant_id());
