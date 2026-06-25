-- ==============================================================================
-- CORRECCIÓN DE RLS PARA PERMITIR VER A TODOS LOS EMPLEADOS
-- ==============================================================================

-- Eliminar la política restrictiva original
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;

-- Crear una nueva política que permite a cualquier usuario de la empresa
-- ver a los demás empleados de su misma empresa.
-- Usamos get_auth_tenant_id() que es SECURITY DEFINER para evitar recursión infinita.
CREATE POLICY "Users can read profiles in same tenant"
  ON public.user_profiles FOR SELECT
  USING (tenant_id = public.get_auth_tenant_id());
