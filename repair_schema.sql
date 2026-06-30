-- ==============================================================================
-- MÓDULO DE TALLER Y REPARACIONES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.repair_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  device_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  issue_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECIBIDO', -- RECIBIDO, EN_REVISION, ESPERANDO_REPUESTO, REPARADO, ENTREGADO, CANCELADO
  estimated_cost DECIMAL(10, 2),
  final_cost DECIMAL(10, 2),
  deposit DECIMAL(10, 2) DEFAULT 0,
  technician_notes TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.repair_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  repair_order_id UUID REFERENCES public.repair_orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Si se usó repuesto del inventario
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10, 2) NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

-- RLS
ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own repair_orders" ON public.repair_orders 
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can manage their own repair_parts" ON public.repair_parts 
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
