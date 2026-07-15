-- 1. Añadir la columna de margen deseado a los productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS target_margin NUMERIC(5, 2) DEFAULT 0;

-- 2. Crear la función automática para actualizar costos y recalcular precios
CREATE OR REPLACE FUNCTION public.update_cost_and_price(
  p_product_id UUID,
  p_new_cost NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_margin NUMERIC;
    v_new_price NUMERIC;
BEGIN
    -- Obtener el margen actual del producto
    SELECT target_margin INTO v_margin FROM public.products WHERE id = p_product_id;
    
    IF v_margin > 0 THEN
        -- Calcular nuevo precio basado en el margen sobre precio de venta
        IF v_margin >= 100 THEN
            v_margin := 99.99;
        END IF;
        v_new_price := p_new_cost / (1 - (v_margin / 100.0));
        
        -- Actualizar costo y precio
        UPDATE public.products 
        SET cost = p_new_cost, price = v_new_price 
        WHERE id = p_product_id;
    ELSE
        -- Solo actualizar costo si no hay margen definido
        UPDATE public.products 
        SET cost = p_new_cost 
        WHERE id = p_product_id;
    END IF;
    
    RETURN TRUE;
END;
$$;
