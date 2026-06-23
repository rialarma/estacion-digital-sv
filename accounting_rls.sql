-- 5. CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS) PARA CONTABILIDAD
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation" ON public.accounts;
CREATE POLICY "Tenant Isolation" ON public.accounts
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.journal_entries;
CREATE POLICY "Tenant Isolation" ON public.journal_entries
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.journal_lines;
CREATE POLICY "Tenant Isolation" ON public.journal_lines
  FOR ALL
  USING (
    entry_id IN (
      SELECT id FROM public.journal_entries 
      WHERE tenant_id = public.get_auth_tenant_id()
    )
  );
