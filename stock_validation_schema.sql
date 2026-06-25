-- 1. Añadir configuración de inventario estricto a tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS allow_negative_stock BOOLEAN DEFAULT true;

-- 2. Actualizar la función de Storefront para incluir el stock de la sucursal matriz
DROP FUNCTION IF EXISTS public.get_storefront_products(UUID);

CREATE OR REPLACE FUNCTION public.get_storefront_products(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_url TEXT,
  category TEXT,
  brand TEXT,
  parent_id UUID,
  variant_name TEXT,
  is_service BOOLEAN,
  is_subscription BOOLEAN,
  stock NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH main_branch AS (
    SELECT id FROM public.branches WHERE tenant_id = p_tenant_id ORDER BY created_at ASC LIMIT 1
  )
  SELECT 
    p.id, 
    p.sku, 
    p.name, 
    p.description, 
    p.price, 
    p.image_url,
    p.category,
    p.brand,
    p.parent_id,
    p.variant_name,
    p.is_service,
    p.is_subscription,
    COALESCE(i.stock, 0) as stock
  FROM public.products p
  LEFT JOIN public.inventory i ON i.product_id = p.id AND i.branch_id = (SELECT id FROM main_branch)
  WHERE p.tenant_id = p_tenant_id 
    AND p.show_on_web = true;
$$;
