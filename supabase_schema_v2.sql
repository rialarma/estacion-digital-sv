-- ==============================================================================
-- 0. EXTENSIONES NECESARIAS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. MÓDULO CORE / MULTI-TENANT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  nrc TEXT,
  nit TEXT,
  activity_desc TEXT,
  subscription_plan TEXT DEFAULT 'BASIC',
  logo_url TEXT,
  receipt_message TEXT,
  tax_iva NUMERIC(5, 2) DEFAULT 13.00,
  tax_retention NUMERIC(5, 2) DEFAULT 1.00,
  theme TEXT DEFAULT 'dark',
  invite_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  establishment_code TEXT,
  point_of_sale_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'GERENTE', 'CAJERO', 'BODEGUERO')),
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- FUNCIÓN AUXILIAR PARA RLS (va DESPUÉS de user_profiles para que el SQL sea válido)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit_measure TEXT DEFAULT '59', -- Según catálogo MH (59 = Unidad)
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  target_margin NUMERIC(5, 2) DEFAULT 0,
  is_taxable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, sku)
);

CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

-- ==============================================================================
-- 3. MÓDULO DE COMPRAS Y PROVEEDORES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  nit TEXT,
  nrc TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  document_type TEXT, -- ej. 'CCF'
  document_number TEXT,
  total NUMERIC(10, 2) NOT NULL,
  status TEXT DEFAULT 'COMPLETADA',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_cost NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. MÓDULO DE VENTAS Y DTE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  document_type TEXT DEFAULT 'NIT', -- NIT, DUI, NRC, PASAPORTE
  document_number TEXT,
  economic_activity_code TEXT, -- Según MH
  business_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own sellers" ON public.sellers FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own sellers" ON public.sellers FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can update their own sellers" ON public.sellers FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can delete their own sellers" ON public.sellers FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax_iva NUMERIC(10, 2) DEFAULT 0,
  tax_retention NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'EFECTIVO',
  status TEXT DEFAULT 'COMPLETADA',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  unit_cost NUMERIC(10, 2) DEFAULT 0,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own purchase_items" ON public.purchase_items FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own purchase_items" ON public.purchase_items FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can update their own purchase_items" ON public.purchase_items FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can delete their own purchase_items" ON public.purchase_items FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own sale_items" ON public.sale_items FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own sale_items" ON public.sale_items FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can update their own sale_items" ON public.sale_items FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can delete their own sale_items" ON public.sale_items FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- RPC: Unirse a Tenant por Código de Invitación
CREATE OR REPLACE FUNCTION public.join_tenant_by_code(
  p_invite_code TEXT,
  p_first_name TEXT,
  p_last_name TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_profile_exists BOOLEAN;
BEGIN
    -- 1. Verificar si el usuario ya tiene perfil
    SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid()) INTO v_profile_exists;
    IF v_profile_exists THEN
        RAISE EXCEPTION 'El usuario ya pertenece a una empresa.';
    END IF;

    -- 2. Buscar el tenant por código
    SELECT id INTO v_tenant_id FROM public.tenants WHERE invite_code = p_invite_code LIMIT 1;
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Código de invitación inválido o expirado.';
    END IF;

    -- 3. Crear el perfil de usuario como CAJERO por defecto
    INSERT INTO public.user_profiles (id, tenant_id, role, first_name, last_name)
    VALUES (auth.uid(), v_tenant_id, 'CAJERO', p_first_name, p_last_name);

    RETURN v_tenant_id;
END;
$$;

-- RPC: Actualizar Rol de Usuario (Solo ADMINs pueden)
CREATE OR REPLACE FUNCTION public.update_user_role(
  p_user_id UUID,
  p_new_role TEXT,
  p_new_branch UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_tenant UUID;
    v_target_tenant UUID;
BEGIN
    -- 1. Obtener perfil del que llama
    SELECT role, tenant_id INTO v_caller_role, v_caller_tenant FROM public.user_profiles WHERE id = auth.uid();
    IF v_caller_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Solo los administradores pueden cambiar roles.';
    END IF;

    -- 2. Obtener perfil del objetivo
    SELECT tenant_id INTO v_target_tenant FROM public.user_profiles WHERE id = p_user_id;
    IF v_caller_tenant != v_target_tenant THEN
        RAISE EXCEPTION 'El usuario no pertenece a su empresa.';
    END IF;

    -- 3. Actualizar
    UPDATE public.user_profiles SET role = p_new_role, branch_id = p_new_branch WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

-- RPC: Regenerar Código de Invitación
CREATE OR REPLACE FUNCTION public.regenerate_invite_code() RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_role TEXT;
    v_tenant_id UUID;
    v_new_code TEXT;
BEGIN
    SELECT role, tenant_id INTO v_caller_role, v_tenant_id FROM public.user_profiles WHERE id = auth.uid();
    IF v_caller_role != 'ADMIN' THEN
        RAISE EXCEPTION 'Solo administradores pueden regenerar el código.';
    END IF;

    v_new_code := substring(md5(random()::text), 1, 6);
    UPDATE public.tenants SET invite_code = v_new_code WHERE id = v_tenant_id;
    
    RETURN v_new_code;
END;
$$;

-- RPC: Actualizar costo y precio desde una compra
CREATE OR REPLACE FUNCTION public.update_cost_and_price(
  p_product_id UUID,
  p_new_cost NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_margin NUMERIC;
    v_new_price NUMERIC;
BEGIN
    -- Obtener el margen actual del producto
    SELECT target_margin INTO v_margin FROM public.products WHERE id = p_product_id;
    
    IF v_margin > 0 THEN
        -- Calcular nuevo precio basado en el markup
        v_new_price := p_new_cost * (1 + (v_margin / 100.0));
        
        -- Actualizar costo y precio
        UPDATE public.products 
        SET cost = p_new_cost, price = v_new_price 
        WHERE id = p_product_id;
    ELSE
        -- Solo actualizar costo si no hay margen definido
        UPDATE public.products 
        SET cost = p_new_cost 
        WHERE id = p_product_id;
    END IF;
    
    RETURN TRUE;
END;
$$;

CREATE TABLE IF NOT EXISTS public.dtes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  dte_type TEXT NOT NULL, -- '01' (FCF), '03' (CCF), '11' (FEX), etc.
  codigo_generacion UUID NOT NULL,
  sello_recepcion TEXT,
  status TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, ENVIADO, SELLADO, RECHAZADO, INVALIDADO
  json_firmado JSONB,
  observaciones TEXT,
  mh_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(codigo_generacion)
);

-- ==============================================================================
-- 5. CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS) MULTI-TENANT
-- ==============================================================================
-- Habilitar RLS en todas las tablas sensibles
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dtes ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Política especial para user_profiles: usa id = auth.uid() para evitar
-- la referencia circular con get_auth_tenant_id()
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (id = auth.uid());

-- -----------------------------------------------------------------------
-- Política especial para tenants: el usuario puede ver su propio tenant
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
DROP POLICY IF EXISTS "Users can update own tenant" ON public.tenants;
CREATE POLICY "Users can read own tenant"
  ON public.tenants FOR SELECT
  USING (id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));
CREATE POLICY "Users can update own tenant"
  ON public.tenants FOR UPDATE
  USING (id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));

-- -----------------------------------------------------------------------
-- Políticas estándar multi-tenant para el resto de tablas
-- -----------------------------------------------------------------------
DO $$ 
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['branches', 'products', 'inventory', 'suppliers', 'purchases', 'clients', 'sales', 'dtes'];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.%I;', t);

    EXECUTE format('CREATE POLICY "Tenant Isolation Select" ON public.%I FOR SELECT USING (tenant_id = public.get_auth_tenant_id());', t);
    EXECUTE format('CREATE POLICY "Tenant Isolation Insert" ON public.%I FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());', t);
    EXECUTE format('CREATE POLICY "Tenant Isolation Update" ON public.%I FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());', t);
    EXECUTE format('CREATE POLICY "Tenant Isolation Delete" ON public.%I FOR DELETE USING (tenant_id = public.get_auth_tenant_id());', t);
  END LOOP;
END $$;
