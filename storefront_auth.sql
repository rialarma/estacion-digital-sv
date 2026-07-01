-- 1. Agregar columna user_id a la tabla clients para vincular con Supabase Auth
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Agregar columna client_id a la tabla web_orders para asociar pedidos
ALTER TABLE public.web_orders ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- 3. Crear RPC para registrar/actualizar el perfil de cliente (Evita RLS)
CREATE OR REPLACE FUNCTION public.register_store_customer(
  p_tenant_id UUID,
  p_name TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_client_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Buscar si el cliente ya existe para este usuario y tenant
  SELECT id INTO v_client_id FROM public.clients 
  WHERE tenant_id = p_tenant_id AND user_id = v_user_id LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (tenant_id, name, phone, address, email, user_id)
    VALUES (p_tenant_id, p_name, p_phone, p_address, COALESCE(p_email, (SELECT email FROM auth.users WHERE id = v_user_id)), v_user_id)
    RETURNING id INTO v_client_id;
  ELSE
    UPDATE public.clients 
    SET name = p_name, phone = p_phone, address = p_address, email = COALESCE(p_email, email)
    WHERE id = v_client_id;
  END IF;

  RETURN v_client_id;
END;
$$;

-- 4. Políticas de Seguridad (RLS) para que los clientes B2C puedan ver su info
DROP POLICY IF EXISTS "Customers can view their own client profile" ON public.clients;
CREATE POLICY "Customers can view their own client profile"
ON public.clients FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update their own client profile" ON public.clients;
CREATE POLICY "Customers can update their own client profile" ON public.clients
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can view their own orders" ON public.web_orders;
CREATE POLICY "Customers can view their own orders"
ON public.web_orders FOR SELECT
TO authenticated
USING (client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Customers can view their own web order items" ON public.web_order_items;
CREATE POLICY "Customers can view their own web order items" ON public.web_order_items
  FOR SELECT USING (web_order_id IN (SELECT id FROM public.web_orders WHERE client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())));

-- 5. Actualizar el RPC submit_web_order para recibir p_client_id
CREATE OR REPLACE FUNCTION public.submit_web_order(
  p_tenant_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_address TEXT,
  p_notes TEXT,
  p_total NUMERIC,
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'CASH',
  p_payment_status TEXT DEFAULT 'PENDING',
  p_client_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- 1. Insertar el pedido con estado de pago y client_id
  INSERT INTO public.web_orders (
    tenant_id, customer_name, customer_phone, delivery_address, 
    notes, total, payment_method, payment_status, client_id
  )
  VALUES (
    p_tenant_id, p_customer_name, p_customer_phone, p_delivery_address, 
    p_notes, p_total, p_payment_method, p_payment_status, p_client_id
  )
  RETURNING id INTO v_order_id;

  -- 2. Insertar los items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.web_order_items (web_order_id, product_id, quantity, price, subtotal)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC,
      (v_item->>'subtotal')::NUMERIC
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;
