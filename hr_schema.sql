-- ==============================================================================
-- MÓDULO DE RECURSOS HUMANOS (RRHH)
-- ==============================================================================

-- 1. TABLA: hr_departments (Departamentos)
CREATE TABLE IF NOT EXISTS public.hr_departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: hr_positions (Cargos)
CREATE TABLE IF NOT EXISTS public.hr_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  department_id UUID REFERENCES public.hr_departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  base_salary NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: hr_employees (Directorio de Empleados)
CREATE TABLE IF NOT EXISTS public.hr_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Opcional, si tiene acceso al sistema
  position_id UUID REFERENCES public.hr_positions(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  document_id TEXT, -- DUI, NIT, etc.
  hire_date DATE,
  status TEXT DEFAULT 'ACTIVO', -- ACTIVO, INACTIVO, SUSPENDIDO
  base_salary NUMERIC(10, 2) DEFAULT 0, -- Permite anular el salario base del cargo si se especifica
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: hr_payroll (Planillas)
CREATE TABLE IF NOT EXISTS public.hr_payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_salary NUMERIC(10, 2) DEFAULT 0,
  bonuses NUMERIC(10, 2) DEFAULT 0,
  deductions NUMERIC(10, 2) DEFAULT 0,
  net_salary NUMERIC(10, 2) GENERATED ALWAYS AS (base_salary + bonuses - deductions) STORED,
  status TEXT DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADO
  payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Habilitar RLS
ALTER TABLE public.hr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_payroll ENABLE ROW LEVEL SECURITY;

-- Limpiar Políticas Existentes (en caso de re-ejecución)
DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.hr_departments;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.hr_departments;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.hr_departments;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.hr_departments;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.hr_positions;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.hr_positions;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.hr_positions;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.hr_positions;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.hr_employees;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.hr_employees;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.hr_employees;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.hr_employees;

DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.hr_payroll;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.hr_payroll;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.hr_payroll;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.hr_payroll;

-- Políticas para hr_departments
CREATE POLICY "Tenant Isolation Select" ON public.hr_departments FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert" ON public.hr_departments FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update" ON public.hr_departments FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete" ON public.hr_departments FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Políticas para hr_positions
CREATE POLICY "Tenant Isolation Select" ON public.hr_positions FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert" ON public.hr_positions FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update" ON public.hr_positions FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete" ON public.hr_positions FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Políticas para hr_employees
CREATE POLICY "Tenant Isolation Select" ON public.hr_employees FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert" ON public.hr_employees FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update" ON public.hr_employees FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete" ON public.hr_employees FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Políticas para hr_payroll
CREATE POLICY "Tenant Isolation Select" ON public.hr_payroll FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert" ON public.hr_payroll FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update" ON public.hr_payroll FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete" ON public.hr_payroll FOR DELETE USING (tenant_id = public.get_auth_tenant_id());
