-- ==============================================================
-- SCHEMA PARA MÓDULO DE CONTABILIDAD - EL SALVADOR
-- ==============================================================

-- 1. Tabla: Catálogo de Cuentas
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- Activo, Pasivo, Patrimonio, Ingreso, Costo, Gasto
  nature VARCHAR(10) NOT NULL, -- deudora o acreedora
  is_group BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.accounts ADD CONSTRAINT unique_account_code_per_tenant UNIQUE (tenant_id, code);

-- 2. Tabla: Partidas Contables (Cabecera)
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  reference_type VARCHAR(50), -- Ej: 'VENTA', 'COMPRA', 'DIARIO'
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla: Detalle de Partidas (Líneas)
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  entry_id UUID REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  debit NUMERIC(15,2) DEFAULT 0,
  credit NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RPC: Generar Catálogo Base para un Tenant
CREATE OR REPLACE FUNCTION public.seed_default_accounts(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
  id_1 UUID := uuid_generate_v4();
  id_11 UUID := uuid_generate_v4();
  id_1101 UUID := uuid_generate_v4();
  id_1102 UUID := uuid_generate_v4();
  id_1103 UUID := uuid_generate_v4();
  id_1104 UUID := uuid_generate_v4();
  
  id_2 UUID := uuid_generate_v4();
  id_21 UUID := uuid_generate_v4();
  id_2101 UUID := uuid_generate_v4();
  id_2102 UUID := uuid_generate_v4();
  
  id_3 UUID := uuid_generate_v4();
  id_31 UUID := uuid_generate_v4();
  id_3101 UUID := uuid_generate_v4();
  id_3102 UUID := uuid_generate_v4();
  
  id_4 UUID := uuid_generate_v4();
  id_41 UUID := uuid_generate_v4();
  id_4101 UUID := uuid_generate_v4();
  
  id_5 UUID := uuid_generate_v4();
  id_51 UUID := uuid_generate_v4();
  id_5101 UUID := uuid_generate_v4();
  
  id_6 UUID := uuid_generate_v4();
  id_61 UUID := uuid_generate_v4();
  id_6101 UUID := uuid_generate_v4();
BEGIN
  SELECT count(*) INTO v_count FROM public.accounts WHERE tenant_id = p_tenant_id;
  IF v_count > 0 THEN
    RETURN FALSE; -- Ya tiene cuentas
  END IF;

  -- 1. ACTIVOS
  INSERT INTO public.accounts (id, tenant_id, code, name, type, nature, is_group, parent_id) VALUES
  (id_1, p_tenant_id, '1', 'ACTIVO', 'Activo', 'deudora', true, NULL),
  (id_11, p_tenant_id, '11', 'Activo Corriente', 'Activo', 'deudora', true, id_1),
  (id_1101, p_tenant_id, '1101', 'Efectivo y Equivalentes', 'Activo', 'deudora', false, id_11),
  (id_1102, p_tenant_id, '1102', 'Cuentas por Cobrar Comerciales', 'Activo', 'deudora', false, id_11),
  (id_1103, p_tenant_id, '1103', 'Inventarios', 'Activo', 'deudora', false, id_11),
  (id_1104, p_tenant_id, '1104', 'IVA Crédito Fiscal (13%)', 'Activo', 'deudora', false, id_11);

  -- 2. PASIVOS
  INSERT INTO public.accounts (id, tenant_id, code, name, type, nature, is_group, parent_id) VALUES
  (id_2, p_tenant_id, '2', 'PASIVO', 'Pasivo', 'acreedora', true, NULL),
  (id_21, p_tenant_id, '21', 'Pasivo Corriente', 'Pasivo', 'acreedora', true, id_2),
  (id_2101, p_tenant_id, '2101', 'Cuentas por Pagar Comerciales', 'Pasivo', 'acreedora', false, id_21),
  (id_2102, p_tenant_id, '2102', 'IVA Débito Fiscal (13%)', 'Pasivo', 'acreedora', false, id_21);

  -- 3. PATRIMONIO
  INSERT INTO public.accounts (id, tenant_id, code, name, type, nature, is_group, parent_id) VALUES
  (id_3, p_tenant_id, '3', 'PATRIMONIO', 'Patrimonio', 'acreedora', true, NULL),
  (id_31, p_tenant_id, '31', 'Capital Social', 'Patrimonio', 'acreedora', true, id_3),
  (id_3101, p_tenant_id, '3101', 'Capital Pagado', 'Patrimonio', 'acreedora', false, id_31),
  (id_3102, p_tenant_id, '3102', 'Utilidades Retenidas', 'Patrimonio', 'acreedora', false, id_31);

  -- 4. INGRESOS
  INSERT INTO public.accounts (id, tenant_id, code, name, type, nature, is_group, parent_id) VALUES
  (id_4, p_tenant_id, '4', 'INGRESOS', 'Ingreso', 'acreedora', true, NULL),
  (id_41, p_tenant_id, '41', 'Ingresos Operativos', 'Ingreso', 'acreedora', true, id_4),
  (id_4101, p_tenant_id, '4101', 'Ingresos por Ventas', 'Ingreso', 'acreedora', false, id_41);

  -- 5. COSTOS
  INSERT INTO public.accounts (id, tenant_id, code, name, type, nature, is_group, parent_id) VALUES
  (id_5, p_tenant_id, '5', 'COSTOS', 'Costo', 'deudora', true, NULL),
  (id_51, p_tenant_id, '51', 'Costos Operativos', 'Costo', 'deudora', true, id_5),
  (id_5101, p_tenant_id, '5101', 'Costo de Ventas', 'Costo', 'deudora', false, id_51);

  -- 6. GASTOS
  INSERT INTO public.accounts (id, tenant_id, code, name, type, nature, is_group, parent_id) VALUES
  (id_6, p_tenant_id, '6', 'GASTOS', 'Gasto', 'deudora', true, NULL),
  (id_61, p_tenant_id, '61', 'Gastos Operativos', 'Gasto', 'deudora', true, id_6),
  (id_6101, p_tenant_id, '6101', 'Gastos de Administración', 'Gasto', 'deudora', false, id_61);

  RETURN TRUE;
END;
$$;

-- 5. CONFIGURACI�N DE RLS PARA CONTABILIDAD
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant Isolation" ON public.accounts;
CREATE POLICY "Tenant Isolation" ON public.accounts
  FOR ALL USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.journal_entries;
CREATE POLICY "Tenant Isolation" ON public.journal_entries
  FOR ALL USING (tenant_id = public.get_auth_tenant_id());

DROP POLICY IF EXISTS "Tenant Isolation" ON public.journal_lines;
CREATE POLICY "Tenant Isolation" ON public.journal_lines
  FOR ALL USING (
    entry_id IN (
      SELECT id FROM public.journal_entries 
      WHERE tenant_id = public.get_auth_tenant_id()
    )
  );
