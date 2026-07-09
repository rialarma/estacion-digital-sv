CREATE OR REPLACE FUNCTION public.admin_impersonate_tenant(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar si el llamador es admin
  IF auth.jwt() ->> 'email' NOT IN ('raam2508@gmail.com', 'admin@estaciondigital.sv') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Upsert en user_profiles para este usuario y el tenant seleccionado
  INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name, username)
  VALUES (
    auth.uid(),
    p_tenant_id,
    'ADMIN',
    'Soporte',
    'GodMode',
    'godmode_' || substring(p_tenant_id::text from 1 for 5)
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    role = 'ADMIN';

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
