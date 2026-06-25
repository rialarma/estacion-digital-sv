-- 1. Modificar tabla de pedidos web para aceptar métodos de pago
ALTER TABLE public.web_orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'CASH', -- CASH, CARD
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'PENDING'; -- PENDING, PAID

-- 2. Actualizar RPC para recibir los nuevos campos de pago
CREATE OR REPLACE FUNCTION public.submit_web_order(
  p_tenant_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_delivery_address TEXT,
  p_notes TEXT,
  p_total NUMERIC,
  p_items JSONB,
  p_payment_method TEXT DEFAULT 'CASH',
  p_payment_status TEXT DEFAULT 'PENDING'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
BEGIN
  -- 1. Insertar el pedido con estado de pago
  INSERT INTO public.web_orders (
    tenant_id, customer_name, customer_phone, delivery_address, 
    notes, total, payment_method, payment_status
  )
  VALUES (
    p_tenant_id, p_customer_name, p_customer_phone, p_delivery_address, 
    p_notes, p_total, p_payment_method, p_payment_status
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


-- 3. Actualizar RPC de conversión para mapear correctamente el método de pago a la venta
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
  v_final_payment_method TEXT;
BEGIN
  -- 1. Obtener la orden web
  SELECT * INTO v_order FROM public.web_orders WHERE id = p_web_order_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Web order not found';
  END IF;

  IF v_order.status = 'DISPATCHED' THEN
    RAISE EXCEPTION 'Web order is already dispatched';
  END IF;

  -- 2. Mapear el método de pago
  IF v_order.payment_method = 'CARD' THEN
    v_final_payment_method := 'TARJETA';
  ELSE
    v_final_payment_method := 'EFECTIVO';
  END IF;

  -- 3. Crear o encontrar al cliente
  SELECT id INTO v_client_id FROM public.clients 
  WHERE tenant_id = v_order.tenant_id AND (phone = v_order.customer_phone OR name = v_order.customer_name)
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (tenant_id, name, phone, address)
    VALUES (v_order.tenant_id, v_order.customer_name, v_order.customer_phone, v_order.delivery_address)
    RETURNING id INTO v_client_id;
  END IF;

  -- 4. Crear la venta con el método de pago correcto
  INSERT INTO public.sales (tenant_id, branch_id, client_id, cashier_id, subtotal, total, payment_method, status, delivery_status)
  VALUES (v_order.tenant_id, p_branch_id, v_client_id, p_cashier_id, v_order.total, v_order.total, v_final_payment_method, 'COMPLETADA', 'PENDIENTE_DE_CARGA')
  RETURNING id INTO v_sale_id;

  -- 5. Insertar items y descontar inventario
  FOR v_item IN SELECT * FROM public.web_order_items WHERE web_order_id = p_web_order_id
  LOOP
    INSERT INTO public.sale_items (tenant_id, sale_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_order.tenant_id, v_sale_id, v_item.product_id, v_item.quantity, v_item.price, v_item.subtotal);

    UPDATE public.inventory
    SET stock = stock - v_item.quantity,
        last_updated = NOW()
    WHERE tenant_id = v_order.tenant_id AND branch_id = p_branch_id AND product_id = v_item.product_id;
  END LOOP;

  -- 6. Crear el DTE asociado a la venta (Factura Consumidor Final por defecto)
  INSERT INTO public.dtes (tenant_id, sale_id, dte_type, codigo_generacion, status)
  VALUES (v_order.tenant_id, v_sale_id, '01', uuid_generate_v4(), 'PENDIENTE');

  -- 7. Generar partida contable automática
  PERFORM public.create_sale_journal_entry(v_sale_id);

  -- 8. Marcar la orden web como despachada
  UPDATE public.web_orders SET status = 'DISPATCHED' WHERE id = p_web_order_id;

  RETURN v_sale_id;
END;
$$;
