-- 1. Añadir columnas a la tabla products para soportar variantes
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- 2. Actualizar la función RPC para retornar los nuevos campos 
-- Agruparemos las variantes en el frontend, así que enviamos todo lo que tenga show_on_web = true
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
  variant_name TEXT
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
    category,
    brand,
    parent_id,
    variant_name
  FROM public.products
  WHERE tenant_id = p_tenant_id 
    AND show_on_web = true;
$$;
