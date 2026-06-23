-- ==============================================================================
-- MODULO DE DESPACHOS Y RUTAS
-- ==============================================================================

-- 1. Tabla de Repartidores / Choferes
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  plate_number TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own drivers" ON public.drivers FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own drivers" ON public.drivers FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can update their own drivers" ON public.drivers FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can delete their own drivers" ON public.drivers FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- 2. Actualizar la tabla de Ventas para incluir entregas
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'ENTREGADO'; -- Por defecto ENTREGADO si no lleva chofer

-- (Si hubieran otras políticas pendientes para sales/sale_items no afectarían, aquí sólo agregamos las columnas)
