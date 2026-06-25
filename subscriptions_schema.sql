-- ==============================================================================
-- MÓDULO DE SUSCRIPCIONES Y MEMBRESÍAS
-- ==============================================================================

-- 1. Modificar tabla de productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 30;

-- 2. Crear tabla de suscripciones activas
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  last_payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, product_id) -- Un cliente solo puede tener 1 suscripción activa del MISMO producto (ej. Solo 1 "Plan Anual" activo a la vez, si paga de nuevo, se extiende la end_date)
);

-- Habilitar RLS
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_subscriptions
CREATE POLICY "Tenant Isolation for client_subscriptions" 
ON public.client_subscriptions 
FOR ALL USING (tenant_id = public.get_auth_tenant_id());

-- 3. Crear función (RPC) para procesar la suscripción
-- Si el cliente ya tenía la membresía y NO estaba vencida, se le suman los días a la fecha de fin actual.
-- Si ya estaba vencida, cuenta a partir del día de hoy.
CREATE OR REPLACE FUNCTION public.process_subscription_sale(
  p_client_id UUID,
  p_product_id UUID,
  p_days INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_existing_end_date DATE;
    v_new_start_date DATE;
    v_new_end_date DATE;
BEGIN
    -- 1. Obtener tenant
    SELECT tenant_id INTO v_tenant_id 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'No tenant context found';
    END IF;

    -- 2. Verificar si ya existe
    SELECT end_date INTO v_existing_end_date
    FROM public.client_subscriptions
    WHERE client_id = p_client_id AND product_id = p_product_id AND tenant_id = v_tenant_id;

    IF FOUND THEN
        -- Si existe, vemos si ya está vencida
        IF v_existing_end_date >= CURRENT_DATE THEN
            -- No está vencida: Sumamos los días a la fecha de fin
            v_new_end_date := v_existing_end_date + p_days;
            
            UPDATE public.client_subscriptions
            SET end_date = v_new_end_date, last_payment_date = CURRENT_DATE, status = 'ACTIVE'
            WHERE client_id = p_client_id AND product_id = p_product_id AND tenant_id = v_tenant_id;
        ELSE
            -- Estaba vencida: Empieza desde hoy
            v_new_end_date := CURRENT_DATE + p_days;
            
            UPDATE public.client_subscriptions
            SET start_date = CURRENT_DATE, end_date = v_new_end_date, last_payment_date = CURRENT_DATE, status = 'ACTIVE'
            WHERE client_id = p_client_id AND product_id = p_product_id AND tenant_id = v_tenant_id;
        END IF;
    ELSE
        -- Nueva membresía
        v_new_end_date := CURRENT_DATE + p_days;
        
        INSERT INTO public.client_subscriptions (tenant_id, client_id, product_id, start_date, end_date, status, last_payment_date)
        VALUES (v_tenant_id, p_client_id, p_product_id, CURRENT_DATE, v_new_end_date, 'ACTIVE', CURRENT_DATE);
    END IF;

    RETURN TRUE;
END;
$$;
