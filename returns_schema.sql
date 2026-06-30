-- ==============================================================================
-- MÓDULO DE DEVOLUCIONES Y NOTAS DE CRÉDITO
-- ==============================================================================

-- 1. Tabla de Devoluciones
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  cashier_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Items Devueltos
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  return_id UUID REFERENCES public.returns(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Tenants can view their own returns" ON public.returns FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own returns" ON public.returns FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can view their own return items" ON public.return_items FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own return items" ON public.return_items FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- 3. RPC para Procesar Devolución
CREATE OR REPLACE FUNCTION process_return(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_sale_id UUID,
  p_cashier_id UUID,
  p_shift_id UUID,
  p_reason TEXT,
  p_items JSONB -- Array of { product_id, quantity, unit_price, subtotal, is_service }
) RETURNS UUID AS $$
DECLARE
  v_return_id UUID;
  v_total_amount DECIMAL(10,2) := 0;
  v_item RECORD;
  v_inv_id UUID;
  v_prev_stock DECIMAL(10,2);
  v_batch_id UUID;
BEGIN
  -- Insertar la cabecera de la devolución
  INSERT INTO public.returns (tenant_id, branch_id, sale_id, cashier_id, reason)
  VALUES (p_tenant_id, p_branch_id, p_sale_id, p_cashier_id, p_reason)
  RETURNING id INTO v_return_id;

  -- Iterar sobre los items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity DECIMAL, unit_price DECIMAL, subtotal DECIMAL, is_service BOOLEAN)
  LOOP
    -- Sumar al total
    v_total_amount := v_total_amount + v_item.subtotal;

    -- Insertar el item de devolución
    INSERT INTO public.return_items (tenant_id, return_id, product_id, quantity, unit_price, subtotal)
    VALUES (p_tenant_id, v_return_id, v_item.product_id, v_item.quantity, v_item.unit_price, v_item.subtotal);

    -- Si no es un servicio, devolver al inventario
    IF NOT v_item.is_service THEN
      -- Obtener el inventario actual
      SELECT id, stock INTO v_inv_id, v_prev_stock FROM public.inventory WHERE tenant_id = p_tenant_id AND branch_id = p_branch_id AND product_id = v_item.product_id;

      IF v_inv_id IS NOT NULL THEN
        -- Actualizar stock
        UPDATE public.inventory SET stock = stock + v_item.quantity, last_updated = NOW() WHERE id = v_inv_id;

        -- Registrar en kardex
        INSERT INTO public.inventory_movements (tenant_id, branch_id, product_id, movement_type, quantity, previous_stock, new_stock, reference_id, description, created_by)
        VALUES (p_tenant_id, p_branch_id, v_item.product_id, 'IN', v_item.quantity, v_prev_stock, v_prev_stock + v_item.quantity, v_return_id, 'Devolución de Venta (POS)', p_cashier_id);
        
        -- Intentar añadir a algún lote (product_batches) si existe alguno activo para ese producto
        SELECT id INTO v_batch_id FROM public.product_batches WHERE tenant_id = p_tenant_id AND branch_id = p_branch_id AND product_id = v_item.product_id ORDER BY expiration_date DESC LIMIT 1;
        
        IF v_batch_id IS NOT NULL THEN
            UPDATE public.product_batches SET current_stock = current_stock + v_item.quantity WHERE id = v_batch_id;
        END IF;

      END IF;
    END IF;
  END LOOP;

  -- Actualizar el monto total de la devolución
  UPDATE public.returns SET total_amount = v_total_amount WHERE id = v_return_id;

  -- Actualizar el total de la venta original para que los cortes de caja y reportes cuadren
  UPDATE public.sales 
  SET 
    total = total - v_total_amount,
    status = CASE 
      WHEN (total - v_total_amount) <= 0 THEN 'DEVUELTA'
      ELSE 'PARCIALMENTE_DEVUELTA'
    END
  WHERE id = p_sale_id;

  RETURN v_return_id;
END;
$$ LANGUAGE plpgsql;
