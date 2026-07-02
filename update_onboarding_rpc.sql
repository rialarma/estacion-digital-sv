-- 1. Actualizar la función register_tenant para incluir el prefijo y generar el username
CREATE OR REPLACE FUNCTION public.register_tenant(
  p_company_name TEXT,
  p_company_nit TEXT,
  p_branch_name TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_company_prefix TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_branch_id UUID;
  v_result JSONB;
  v_username TEXT;
  v_safe_prefix TEXT;
  v_safe_fname TEXT;
  v_safe_lname TEXT;
BEGIN
  -- 1. Obtener el ID del usuario
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- 2. Verificar si el usuario ya tiene un perfil
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'El usuario ya pertenece a una empresa';
  END IF;

  -- 3. Generar prefijo seguro
  v_safe_prefix := regexp_replace(lower(p_company_prefix), '[^a-z0-9]', '', 'g');
  IF length(v_safe_prefix) = 0 THEN
    v_safe_prefix := 'emp';
  END IF;

  -- 4. Crear el Tenant con el prefijo
  INSERT INTO public.tenants (name, nit, subscription_plan, tenant_prefix)
  VALUES (p_company_name, p_company_nit, 'BASIC', v_safe_prefix)
  RETURNING id INTO v_tenant_id;

  -- 5. Crear la Sucursal Principal
  INSERT INTO public.branches (tenant_id, name, establishment_code, point_of_sale_code)
  VALUES (v_tenant_id, p_branch_name, '0001', '0001')
  RETURNING id INTO v_branch_id;

  -- 6. Generar username
  v_safe_fname := substring(regexp_replace(lower(p_first_name), '[^a-z0-9]', '', 'g') from 1 for 3);
  v_safe_lname := substring(regexp_replace(lower(p_last_name), '[^a-z0-9]', '', 'g') from 1 for 3);
  v_username := v_safe_prefix || v_safe_fname || v_safe_lname;

  -- 7. Crear el Perfil del Usuario
  INSERT INTO public.user_profiles (id, tenant_id, branch_id, role, first_name, last_name, username)
  VALUES (v_user_id, v_tenant_id, v_branch_id, 'ADMIN', p_first_name, p_last_name, v_username);

  -- 8. Insertarlo también en Recursos Humanos para que aparezca en el directorio
  INSERT INTO public.hr_employees (tenant_id, user_id, first_name, last_name, status)
  VALUES (v_tenant_id, v_user_id, p_first_name, p_last_name, 'ACTIVO');

  -- 9. Devolver éxito
  v_result := jsonb_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'branch_id', v_branch_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Actualizar a las empresas (tenants) que no tengan prefijo
UPDATE public.tenants
SET tenant_prefix = substring(regexp_replace(lower(name), '[^a-z0-9]', '', 'g') from 1 for 3)
WHERE tenant_prefix IS NULL OR tenant_prefix = 'emp';

-- 3. Actualizar a los perfiles que no tengan username
DO $$
DECLARE
    r RECORD;
    v_safe_prefix TEXT;
    v_safe_fname TEXT;
    v_safe_lname TEXT;
    v_username TEXT;
BEGIN
    FOR r IN (
        SELECT p.id, p.first_name, p.last_name, t.tenant_prefix
        FROM public.user_profiles p
        JOIN public.tenants t ON p.tenant_id = t.id
        WHERE p.username IS NULL
    ) LOOP
        v_safe_prefix := regexp_replace(lower(COALESCE(r.tenant_prefix, 'emp')), '[^a-z0-9]', '', 'g');
        v_safe_fname := substring(regexp_replace(lower(r.first_name), '[^a-z0-9]', '', 'g') from 1 for 3);
        v_safe_lname := substring(regexp_replace(lower(r.last_name), '[^a-z0-9]', '', 'g') from 1 for 3);
        v_username := v_safe_prefix || v_safe_fname || v_safe_lname;
        
        BEGIN
            UPDATE public.user_profiles SET username = v_username WHERE id = r.id;
        EXCEPTION WHEN unique_violation THEN
            UPDATE public.user_profiles SET username = v_username || floor(random() * 100)::text WHERE id = r.id;
        END;
    END LOOP;
END;
$$;

-- 4. Agregar a Recursos Humanos a los dueños/admin (como Claudia) que no estaban ahí
INSERT INTO public.hr_employees (tenant_id, user_id, first_name, last_name, status)
SELECT p.tenant_id, p.id, p.first_name, p.last_name, 'ACTIVO'
FROM public.user_profiles p
LEFT JOIN public.hr_employees e ON p.id = e.user_id
WHERE e.id IS NULL AND p.role = 'ADMIN';

-- 5. Trigger para actualizar usernames automáticamente si cambias el prefijo de la empresa
CREATE OR REPLACE FUNCTION public.sync_usernames_on_prefix_change()
RETURNS TRIGGER AS $$
DECLARE
    v_safe_fname TEXT;
    v_safe_lname TEXT;
    v_safe_prefix TEXT;
    r RECORD;
BEGIN
    IF NEW.tenant_prefix IS DISTINCT FROM OLD.tenant_prefix THEN
        v_safe_prefix := regexp_replace(lower(NEW.tenant_prefix), '[^a-z0-9]', '', 'g');
        IF length(v_safe_prefix) = 0 THEN
            v_safe_prefix := 'emp';
        END IF;

        NEW.tenant_prefix := v_safe_prefix;

        FOR r IN SELECT id, first_name, last_name FROM public.user_profiles WHERE tenant_id = NEW.id LOOP
            v_safe_fname := substring(regexp_replace(lower(r.first_name), '[^a-z0-9]', '', 'g') from 1 for 3);
            v_safe_lname := substring(regexp_replace(lower(r.last_name), '[^a-z0-9]', '', 'g') from 1 for 3);
            
            BEGIN
                UPDATE public.user_profiles 
                SET username = v_safe_prefix || v_safe_fname || v_safe_lname
                WHERE id = r.id;
            EXCEPTION WHEN unique_violation THEN
                UPDATE public.user_profiles 
                SET username = v_safe_prefix || v_safe_fname || v_safe_lname || floor(random() * 100)::text
                WHERE id = r.id;
            END;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_usernames ON public.tenants;
CREATE TRIGGER trigger_sync_usernames
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.sync_usernames_on_prefix_change();
