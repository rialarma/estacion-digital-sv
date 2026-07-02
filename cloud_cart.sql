-- Tablas para Carrito en la Nube (Cloud Cart)

CREATE TABLE IF NOT EXISTS public.store_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, client_id)
);

CREATE TABLE IF NOT EXISTS public.store_cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID REFERENCES public.store_carts(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);

-- Habilitar RLS
ALTER TABLE public.store_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_cart_items ENABLE ROW LEVEL SECURITY;

-- Politicas para store_carts
DROP POLICY IF EXISTS "Clients can manage their own carts" ON public.store_carts;
CREATE POLICY "Clients can manage their own carts"
ON public.store_carts
FOR ALL
TO authenticated
USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

-- Politicas para store_cart_items
DROP POLICY IF EXISTS "Clients can manage their own cart items" ON public.store_cart_items;
CREATE POLICY "Clients can manage their own cart items"
ON public.store_cart_items
FOR ALL
TO authenticated
USING (cart_id IN (SELECT id FROM public.store_carts WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())));

-- RPC para sincronizar carrito local con nube
CREATE OR REPLACE FUNCTION sync_store_cart(
  p_tenant_id UUID,
  p_client_id UUID,
  p_items JSONB -- [{product_id, quantity}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cart_id UUID;
  v_item JSONB;
  v_existing_quantity INT;
BEGIN
  -- Verificar si es el usuario dueño del client_id
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Obtener o crear el carrito
  INSERT INTO public.store_carts (tenant_id, client_id)
  VALUES (p_tenant_id, p_client_id)
  ON CONFLICT (tenant_id, client_id) DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_cart_id;

  -- Si p_items no es NULL, sincronizamos (eliminar los que ya no están, y actualizar los que sí)
  IF p_items IS NOT NULL THEN
    IF jsonb_array_length(p_items) = 0 THEN
      -- Si el array está vacío, significa que el carrito local se vació (ej. después de comprar)
      DELETE FROM public.store_cart_items WHERE cart_id = v_cart_id;
    ELSE
      -- Eliminar los items de la BD que no están en el carrito local actual
      DELETE FROM public.store_cart_items 
      WHERE cart_id = v_cart_id 
      AND product_id NOT IN (
        SELECT (value->>'product_id')::UUID FROM jsonb_array_elements(p_items)
      );

      -- Insertar o actualizar los items que vienen en el JSON
      FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
      LOOP
        INSERT INTO public.store_cart_items (cart_id, product_id, quantity)
        VALUES (v_cart_id, (v_item->>'product_id')::UUID, (v_item->>'quantity')::INT)
        ON CONFLICT (cart_id, product_id) 
        DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW();
      END LOOP;
    END IF;
  END IF;

  -- Devolver los items combinados actuales desde la BD con la data completa del producto
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'price', p.price,
        'image_url', p.image_url,
        'tenant_id', p.tenant_id,
        'quantity', ci.quantity
      )
    ), '[]'::jsonb)
    FROM public.store_cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id
  );
END;
$$;
