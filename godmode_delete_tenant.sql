CREATE OR REPLACE FUNCTION public.godmode_delete_tenant(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Verificar permisos (God Mode)
  IF auth.jwt() ->> 'email' NOT IN ('raam2508@gmail.com', 'admin@estaciondigital.sv') THEN
    RAISE EXCEPTION 'No autorizado. Solo Super Admin puede borrar empresas.';
  END IF;

  -- 1. Eliminar de auth.users a todos los usuarios vinculados a este tenant
  -- Esto hará cascada y eliminará los registros en public.user_profiles si está configurado el ON DELETE CASCADE.
  DELETE FROM auth.users
  WHERE id IN (
    SELECT id FROM public.user_profiles WHERE tenant_id = p_tenant_id
  );

  -- 2. Eliminar la empresa de la tabla tenants
  -- (Esto eliminará sucursales, ventas, inventario, etc., si las fk tienen ON DELETE CASCADE)
  DELETE FROM public.tenants 
  WHERE id = p_tenant_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
