-- ==============================================================================
-- POLÍTICA DE SEGURIDAD PARA SUPER ADMINS EN GOD MODE
-- ==============================================================================

-- Permitir que el Super Admin (tú) pueda ver y editar a TODOS los inquilinos (Tenants)
-- a pesar de no pertenecer a ninguna empresa específicamente.

DROP POLICY IF EXISTS "SuperAdmins can manage all tenants" ON public.tenants;

CREATE POLICY "SuperAdmins can manage all tenants"
  ON public.tenants
  FOR ALL
  USING (auth.jwt() ->> 'email' IN ('raam2508@gmail.com', 'admin@estaciondigital.sv'));

-- Refrescar caché
NOTIFY pgrst, 'reload schema';
