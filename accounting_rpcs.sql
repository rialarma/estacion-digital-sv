-- ==============================================================
-- CONTABILIDAD AUTOMÁTICA - RPCS PARA VENTAS Y COMPRAS
-- ==============================================================

-- 1. Añadir campos a Ventas y Compras
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CONTADO';
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'CONTADO';

-- 2. RPC para Venta
CREATE OR REPLACE FUNCTION public.create_sale_journal_entry(p_sale_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_total_sale NUMERIC;
    v_tax_amount NUMERIC;
    v_total_cost NUMERIC;
    v_payment_method VARCHAR;
    v_entry_id UUID;
    
    -- Variables para IDs de cuentas
    acc_efectivo UUID;
    acc_cxc UUID;
    acc_ingresos UUID;
    acc_iva_debito UUID;
    acc_costo UUID;
    acc_inventario UUID;
BEGIN
    -- Obtener datos de la venta
    SELECT tenant_id, total, payment_method 
    INTO v_tenant_id, v_total_sale, v_payment_method
    FROM public.sales WHERE id = p_sale_id;

    -- Calcular IVA (Asumimos 13% incluido o agregado. Si total_amount es con IVA, ingresos es total/1.13)
    -- Asumiendo que v_total_sale ya incluye el 13% IVA según el frontend Ventas.jsx
    v_tax_amount := v_total_sale - (v_total_sale / 1.13);
    
    -- Obtener el costo total de los productos vendidos
    SELECT COALESCE(SUM(quantity * unit_cost), 0) INTO v_total_cost
    FROM public.sale_items WHERE sale_id = p_sale_id;

    -- Buscar las cuentas necesarias para este tenant
    SELECT id INTO acc_efectivo FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '1101';
    SELECT id INTO acc_cxc FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '1102';
    SELECT id INTO acc_inventario FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '1103';
    SELECT id INTO acc_iva_debito FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '2102';
    SELECT id INTO acc_ingresos FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '4101';
    SELECT id INTO acc_costo FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '5101';

    -- Si alguna cuenta no existe, abortar silenciosamente (quizá no han configurado contabilidad)
    IF acc_efectivo IS NULL THEN RETURN FALSE; END IF;

    -- 1. Crear el encabezado de la partida
    INSERT INTO public.journal_entries (tenant_id, description, reference_type, reference_id)
    VALUES (v_tenant_id, 'Registro Automático de Venta', 'VENTA', p_sale_id)
    RETURNING id INTO v_entry_id;

    -- 2. Líneas de Partida
    
    -- Cargo a Efectivo o Cuentas por Cobrar (Total con IVA)
    IF v_payment_method = 'CONTADO' THEN
        INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_efectivo, v_total_sale, 0);
    ELSE
        INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_cxc, v_total_sale, 0);
    END IF;

    -- Abono a Ingresos (Total sin IVA)
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_ingresos, 0, v_total_sale - v_tax_amount);
    
    -- Abono a IVA Débito Fiscal
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_iva_debito, 0, v_tax_amount);

    -- Cargo a Costo de Ventas
    IF v_total_cost > 0 THEN
        INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_costo, v_total_cost, 0);
        -- Abono a Inventarios
        INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_inventario, 0, v_total_cost);
    END IF;

    RETURN TRUE;
END;
$$;

-- 3. RPC para Compra
CREATE OR REPLACE FUNCTION public.create_purchase_journal_entry(p_purchase_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_total_purchase NUMERIC;
    v_tax_amount NUMERIC;
    v_payment_method VARCHAR;
    v_entry_id UUID;
    
    acc_efectivo UUID;
    acc_cxp UUID;
    acc_inventario UUID;
    acc_iva_credito UUID;
BEGIN
    SELECT tenant_id, total_amount, payment_method 
    INTO v_tenant_id, v_total_purchase, v_payment_method
    FROM public.purchases WHERE id = p_purchase_id;

    -- Calcular IVA
    -- Asumiendo que v_total_purchase es sin IVA y se paga 13% adicional
    -- NOTA: Ajustar según cómo se guarde en Compras.jsx. Si total_amount ya tiene IVA:
    -- v_tax_amount := v_total_purchase - (v_total_purchase / 1.13);
    -- Asumiremos que el frontend guarda el total_amount *YA CON IVA*.
    v_tax_amount := v_total_purchase - (v_total_purchase / 1.13);

    SELECT id INTO acc_efectivo FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '1101';
    SELECT id INTO acc_inventario FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '1103';
    SELECT id INTO acc_iva_credito FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '1104';
    SELECT id INTO acc_cxp FROM public.accounts WHERE tenant_id = v_tenant_id AND code = '2101';

    IF acc_efectivo IS NULL THEN RETURN FALSE; END IF;

    INSERT INTO public.journal_entries (tenant_id, description, reference_type, reference_id)
    VALUES (v_tenant_id, 'Registro Automático de Compra', 'COMPRA', p_purchase_id)
    RETURNING id INTO v_entry_id;

    -- Cargo a Inventarios (Total sin IVA)
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_inventario, v_total_purchase - v_tax_amount, 0);
    
    -- Cargo a IVA Crédito Fiscal
    INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_iva_credito, v_tax_amount, 0);

    -- Abono a Efectivo o Cuentas por Pagar (Total con IVA)
    IF v_payment_method = 'CONTADO' THEN
        INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_efectivo, 0, v_total_purchase);
    ELSE
        INSERT INTO public.journal_lines (entry_id, account_id, debit, credit) VALUES (v_entry_id, acc_cxp, 0, v_total_purchase);
    END IF;

    RETURN TRUE;
END;
$$;
