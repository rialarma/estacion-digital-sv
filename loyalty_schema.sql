-- ==============================================================================
-- MÓDULO DE FIDELIZACIÓN (PUNTOS)
-- ==============================================================================

-- 1. Añadir saldo de puntos a clientes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;

-- 2. Tabla para historial de puntos (auditoría)
CREATE TABLE IF NOT EXISTS public.client_points_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL, -- Si fue por una venta
  points_change INTEGER NOT NULL, -- Positivo si gana puntos, negativo si los gasta
  description TEXT, -- Ej: "Compra en POS", "Canje por descuento", "Ajuste manual"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para client_points_history
ALTER TABLE public.client_points_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own points history" ON public.client_points_history FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own points history" ON public.client_points_history FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can update their own points history" ON public.client_points_history FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can delete their own points history" ON public.client_points_history FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
