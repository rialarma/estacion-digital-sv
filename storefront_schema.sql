-- 1. Actualizar la tabla de productos
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS show_on_web BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Crear función RPC para obtener productos de la tienda pública sin restricciones RLS
-- Esta función usará SECURITY DEFINER para saltarse el RLS del ERP y exponer SOLO los productos
-- que pertenezcan al tenant indicado y que tengan show_on_web = true.
CREATE OR REPLACE FUNCTION public.get_storefront_products(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  sku TEXT,
  name TEXT,
  description TEXT,
  price NUMERIC,
  image_url TEXT,
  category TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id, 
    sku, 
    name, 
    description, 
    price, 
    image_url,
    category
  FROM public.products
  WHERE tenant_id = p_tenant_id 
    AND show_on_web = true;
$$;
