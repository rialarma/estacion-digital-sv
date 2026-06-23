-- 1. Agregar columna balance a ventas y compras
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0;

-- 2. Crear tabla Cuentas por Cobrar (Pagos de Clientes)
CREATE TABLE IF NOT EXISTS public.cxc_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'EFECTIVO',
  reference_number TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear tabla Cuentas por Pagar (Pagos a Proveedores)
CREATE TABLE IF NOT EXISTS public.cxp_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'EFECTIVO',
  reference_number TEXT,
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Habilitar RLS en las nuevas tablas
ALTER TABLE public.cxc_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cxp_payments ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad (RLS)
CREATE POLICY "Tenant isolation for cxc_payments"
  ON public.cxc_payments FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant isolation for cxp_payments"
  ON public.cxp_payments FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
