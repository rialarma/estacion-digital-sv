-- ==============================================================================
-- PLAN DE ESCALAMIENTO TIER-1 (CAJA, KARDEX, COTIZACIONES, SAAS)
-- ==============================================================================

-- 1. ACTUALIZACIÓN MULTI-SAAS (Suscripciones)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'ACTIVE'; -- ACTIVE, SUSPENDED, CANCELED

-- 2. MÓDULO DE CAJA (Turnos)
CREATE TABLE IF NOT EXISTS public.cash_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  cashier_id UUID REFERENCES public.user_profiles(id) ON DELETE RESTRICT NOT NULL,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  opening_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  expected_balance NUMERIC(10, 2) DEFAULT 0,
  actual_balance NUMERIC(10, 2) DEFAULT 0,
  difference NUMERIC(10, 2) DEFAULT 0,
  status TEXT DEFAULT 'OPEN', -- OPEN, CLOSED
  notes TEXT
);

-- Vincular Ventas a un Turno de Caja (opcional al inicio, luego forzoso por app)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.cash_shifts(id) ON DELETE SET NULL;


-- 3. KARDEX (Historial de Movimientos de Inventario)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL, -- 'IN' (Compra, Ajuste+), 'OUT' (Venta, Ajuste-), 'TRANSFER'
  quantity NUMERIC(10, 2) NOT NULL,
  previous_stock NUMERIC(10, 2) NOT NULL,
  new_stock NUMERIC(10, 2) NOT NULL,
  reference_id UUID, -- Puede ser id de venta, compra o traslado
  description TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Traslados de Inventario
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  from_branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  to_branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID REFERENCES public.inventory_transfers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL
);


-- 4. MÓDULO DE COTIZACIONES (Proformas)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  tax_iva NUMERIC(10, 2) DEFAULT 0,
  tax_retention NUMERIC(10, 2) DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  valid_until TIMESTAMPTZ,
  status TEXT DEFAULT 'PENDING', -- PENDING, CONVERTED, EXPIRED
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 5. Habilitar RLS en las nuevas tablas
ALTER TABLE public.cash_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Seguridad (Aislamiento Multi-Tenant)
CREATE POLICY "Tenant isolation cash_shifts" ON public.cash_shifts FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation inventory_movements" ON public.inventory_movements FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation inventory_transfers" ON public.inventory_transfers FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
-- transfer items usa cascade, pero le ponemos por si acaso
CREATE POLICY "Tenant isolation quotes" ON public.quotes FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenant isolation quote_items" ON public.quote_items FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
