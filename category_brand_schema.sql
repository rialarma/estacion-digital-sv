-- Tabla de Categorías de Productos
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Tabla de Marcas de Productos
CREATE TABLE IF NOT EXISTS public.product_brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Habilitar RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;

-- Políticas de aislamiento multi-tenant para Categorías
DROP POLICY IF EXISTS "Tenant Isolation Select product_categories" ON public.product_categories;
DROP POLICY IF EXISTS "Tenant Isolation Insert product_categories" ON public.product_categories;
DROP POLICY IF EXISTS "Tenant Isolation Update product_categories" ON public.product_categories;
DROP POLICY IF EXISTS "Tenant Isolation Delete product_categories" ON public.product_categories;

CREATE POLICY "Tenant Isolation Select product_categories" ON public.product_categories FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert product_categories" ON public.product_categories FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update product_categories" ON public.product_categories FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete product_categories" ON public.product_categories FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Políticas de aislamiento multi-tenant para Marcas
DROP POLICY IF EXISTS "Tenant Isolation Select product_brands" ON public.product_brands;
DROP POLICY IF EXISTS "Tenant Isolation Insert product_brands" ON public.product_brands;
DROP POLICY IF EXISTS "Tenant Isolation Update product_brands" ON public.product_brands;
DROP POLICY IF EXISTS "Tenant Isolation Delete product_brands" ON public.product_brands;

CREATE POLICY "Tenant Isolation Select product_brands" ON public.product_brands FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert product_brands" ON public.product_brands FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update product_brands" ON public.product_brands FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete product_brands" ON public.product_brands FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Migrar datos existentes (Categorías)
INSERT INTO public.product_categories (tenant_id, name)
SELECT DISTINCT tenant_id, category
FROM public.products
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Migrar datos existentes (Marcas)
INSERT INTO public.product_brands (tenant_id, name)
SELECT DISTINCT tenant_id, brand
FROM public.products
WHERE brand IS NOT NULL AND brand != ''
ON CONFLICT (tenant_id, name) DO NOTHING;
