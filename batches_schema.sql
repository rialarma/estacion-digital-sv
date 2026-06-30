-- ==============================================================================
-- MÓDULO DE LOTES Y VENCIMIENTOS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.product_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  batch_number TEXT,
  expiration_date DATE,
  current_stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.product_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants can view their own batches" ON public.product_batches FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can insert their own batches" ON public.product_batches FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can update their own batches" ON public.product_batches FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
CREATE POLICY "Tenants can delete their own batches" ON public.product_batches FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));
