-- ==============================================================================
-- ACTUALIZACIÓN MÓDULO DE RECURSOS HUMANOS (RRHH) - VERSIÓN EMPRESARIAL
-- ==============================================================================

-- 1. Actualizar hr_payroll para desglosar conceptos y deducciones de ley
-- PostgreSQL no permite ALTER TABLE ... ALTER COLUMN ... GENERATED ALWAYS AS directamente de forma sencilla si altera el tipo o dependencias complejas.
-- Lo más seguro es eliminar la columna net_salary y volverla a crear.

ALTER TABLE public.hr_payroll DROP COLUMN IF EXISTS net_salary;

ALTER TABLE public.hr_payroll 
  ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'MENSUAL', -- MENSUAL, QUINCENAL_1, QUINCENAL_2
  ADD COLUMN IF NOT EXISTS commissions NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vacation_bonus NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS isss_deduction NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS afp_deduction NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renta_deduction NUMERIC(10, 2) DEFAULT 0;

ALTER TABLE public.hr_payroll
  ADD COLUMN net_salary NUMERIC(10, 2) GENERATED ALWAYS AS (
    base_salary + bonuses + commissions + overtime_pay + vacation_bonus - isss_deduction - afp_deduction - renta_deduction - deductions
  ) STORED;

-- 2. TABLA: hr_attendance (Control de Asistencia y Horas Extra por Empleado)
CREATE TABLE IF NOT EXISTS public.hr_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  regular_hours NUMERIC(5, 2) DEFAULT 0,
  overtime_hours NUMERIC(5, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, employee_id, date)
);

-- 3. TABLA: hr_vacations (Control de Vacaciones)
CREATE TABLE IF NOT EXISTS public.hr_vacations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES public.hr_employees(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  return_date DATE,
  status TEXT DEFAULT 'APROBADO', -- SOLICITADO, APROBADO, RECHAZADO, DISFRUTADO
  paid_amount NUMERIC(10, 2) DEFAULT 0, -- El monto que se pagó como prima
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.hr_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_vacations ENABLE ROW LEVEL SECURITY;

-- Políticas para hr_attendance
DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.hr_attendance;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.hr_attendance;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.hr_attendance;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.hr_attendance;

CREATE POLICY "Tenant Isolation Select" ON public.hr_attendance FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert" ON public.hr_attendance FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update" ON public.hr_attendance FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete" ON public.hr_attendance FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Políticas para hr_vacations
DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.hr_vacations;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.hr_vacations;
DROP POLICY IF EXISTS "Tenant Isolation Update" ON public.hr_vacations;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.hr_vacations;

CREATE POLICY "Tenant Isolation Select" ON public.hr_vacations FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Insert" ON public.hr_vacations FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Update" ON public.hr_vacations FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenant Isolation Delete" ON public.hr_vacations FOR DELETE USING (tenant_id = public.get_auth_tenant_id());
