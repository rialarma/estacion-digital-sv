CREATE OR REPLACE FUNCTION public.godmode_delete_tenant(p_tenant_id UUID)
RETURNS void AS $$
DECLARE
  v_users_to_delete UUID[];
BEGIN
  -- Verificar permisos (God Mode)
  IF auth.jwt() ->> 'email' NOT IN ('raam2508@gmail.com', 'admin@estaciondigital.sv') THEN
    RAISE EXCEPTION 'No autorizado. Solo Super Admin puede borrar empresas.';
  END IF;

  -- 1. Recopilar TODOS los usuarios vinculados al tenant (empleados y clientes finales)
  SELECT array_agg(id) INTO v_users_to_delete
  FROM (
    SELECT id FROM public.user_profiles WHERE tenant_id = p_tenant_id
    UNION
    SELECT user_id FROM public.clients WHERE tenant_id = p_tenant_id AND user_id IS NOT NULL
  ) AS u;

  -- 2. (La eliminación de storage objects se moverá al frontend usando la API de Supabase)

  -- 3. Eliminar la empresa de la tabla tenants
  -- (Esto eliminará en cascada sucursales, ventas, inventario, perfiles de usuario, clientes, etc.)
  DELETE FROM public.tenants 
  WHERE id = p_tenant_id;

  -- 4. Eliminar las cuentas de autenticación
  -- Al borrar desde auth.users, se limpian también identidades y sesiones.
  IF array_length(v_users_to_delete, 1) > 0 THEN
    DELETE FROM auth.users WHERE id = ANY(v_users_to_delete);
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
