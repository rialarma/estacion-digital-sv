-- Script para habilitar el acceso público (sin iniciar sesión) a la configuración de la tienda virtual
-- Ejecutar en el SQL Editor de Supabase

-- 1. Función para obtener la configuración pública de la tienda de forma segura
CREATE OR REPLACE FUNCTION public.get_storefront_config(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT json_build_object(
    'id', id,
    'name', name,
    'logo_url', logo_url,
    'whatsapp_number', whatsapp_number,
    'facebook_url', facebook_url,
    'instagram_url', instagram_url,
    'about_us', about_us,
    'allow_negative_stock', allow_negative_stock,
    'primary_color', primary_color,
    'hero_banner_url', hero_banner_url,
    'store_slogan', store_slogan,
    'store_promo_message', store_promo_message,
    'store_catalog_mode', store_catalog_mode,
    'store_button_text', store_button_text,
    'store_shipping_cost', store_shipping_cost,
    'tiktok_url', tiktok_url,
    'store_show_whatsapp_float', store_show_whatsapp_float,
    'store_primary_text_color', store_primary_text_color
  )::jsonb INTO v_result
  FROM public.tenants
  WHERE id = p_tenant_id;

  RETURN v_result;
END;
$$;

-- 2. Función para obtener las categorías de forma pública
CREATE OR REPLACE FUNCTION public.get_storefront_categories(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'image_url', image_url
    )
  )::jsonb INTO v_result
  FROM (
    SELECT id, name, image_url
    FROM public.product_categories
    WHERE tenant_id = p_tenant_id
    ORDER BY name ASC
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- 3. Función para obtener las marcas de forma pública
CREATE OR REPLACE FUNCTION public.get_storefront_brands(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name
    )
  )::jsonb INTO v_result
  FROM (
    SELECT id, name
    FROM public.product_brands
    WHERE tenant_id = p_tenant_id
    ORDER BY name ASC
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
