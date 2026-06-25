-- 1. Tabla de Pedidos Web
CREATE TABLE IF NOT EXISTS public.web_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT,
  notes TEXT,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'PENDING', -- PENDING, PREPARING, DISPATCHED, CANCELLED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Artículos del Pedido Web
CREATE TABLE IF NOT EXISTS public.web_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  web_order_id UUID REFERENCES public.web_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- Habilitar RLS en las tablas (Solo los empleados autenticados de ese tenant pueden ver los pedidos)
ALTER TABLE public.web_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants can view their own web orders" ON public.web_orders;
CREATE POLICY "Tenants can view their own web orders" ON public.web_orders 
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can update their own web orders" ON public.web_orders;
CREATE POLICY "Tenants can update their own web orders" ON public.web_orders 
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Tenants can view their own web order items" ON public.web_order_items;
CREATE POLICY "Tenants can view their own web order items" ON public.web_order_items 
  FOR SELECT USING (web_order_id IN (SELECT id FROM public.web_orders WHERE tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())));

-- 3. RPC para enviar el pedido desde la tienda pública (Salta RLS de inserción para usuarios no logueados)
CREATE OR REPLACE FUNCTION public.submit_web_order(
  p_tenant_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_address TEXT,
  p_notes TEXT,
  p_total NUMERIC,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- 1. Insertar el pedido
  INSERT INTO public.web_orders (tenant_id, customer_name, customer_phone, delivery_address, notes, total)
  VALUES (p_tenant_id, p_customer_name, p_customer_phone, p_delivery_address, p_notes, p_total)
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

-- 4. RPC para convertir un Pedido Web a Venta formal
CREATE OR REPLACE FUNCTION public.convert_web_order_to_sale(
  p_web_order_id UUID,
  p_cashier_id UUID,
  p_branch_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_client_id UUID;
  v_sale_id UUID;
  v_item RECORD;
BEGIN
  -- 1. Obtener la orden web
  SELECT * INTO v_order FROM public.web_orders WHERE id = p_web_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Web order not found';
  END IF;

  IF v_order.status = 'DISPATCHED' THEN
    RAISE EXCEPTION 'Web order is already dispatched';
  END IF;

  -- 2. Crear o encontrar al cliente (por telefono o nombre)
  SELECT id INTO v_client_id FROM public.clients 
  WHERE tenant_id = v_order.tenant_id AND (phone = v_order.customer_phone OR name = v_order.customer_name)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (tenant_id, name, phone, address)
    VALUES (v_order.tenant_id, v_order.customer_name, v_order.customer_phone, v_order.delivery_address)
    RETURNING id INTO v_client_id;
  END IF;

  -- 3. Crear la venta
  INSERT INTO public.sales (tenant_id, branch_id, client_id, cashier_id, subtotal, total, payment_method, status, delivery_status)
  VALUES (v_order.tenant_id, p_branch_id, v_client_id, p_cashier_id, v_order.total, v_order.total, 'EFECTIVO', 'COMPLETADA', 'PENDIENTE_DE_CARGA')
  RETURNING id INTO v_sale_id;

  -- 4. Insertar items y descontar inventario
  FOR v_item IN SELECT * FROM public.web_order_items WHERE web_order_id = p_web_order_id
  LOOP
    INSERT INTO public.sale_items (tenant_id, sale_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_order.tenant_id, v_sale_id, v_item.product_id, v_item.quantity, v_item.price, v_item.subtotal);

    UPDATE public.inventory
    SET stock = stock - v_item.quantity,
        last_updated = NOW()
    WHERE tenant_id = v_order.tenant_id AND branch_id = p_branch_id AND product_id = v_item.product_id;
  END LOOP;

  -- 5. Marcar la orden web como despachada
  UPDATE public.web_orders SET status = 'DISPATCHED' WHERE id = p_web_order_id;

  RETURN v_sale_id;
END;
$$;
