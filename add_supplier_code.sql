-- 1. Agregar columna supplier_code a la tabla products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_code TEXT;

-- 2. Modificar la columna sku para que permita nulos temporalmente durante el insert
-- (PostgreSQL permite que el trigger BEFORE INSERT llene el valor antes de evaluar el constraint NOT NULL,
-- pero para mayor compatibilidad con APIs, a veces es mejor quitar el NOT NULL si se auto-genera)
ALTER TABLE public.products ALTER COLUMN sku DROP NOT NULL;

-- 3. Crear tabla para secuencias de empresas (correlativos de SKU)
CREATE TABLE IF NOT EXISTS public.tenant_sequences (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  last_sku_seq INTEGER DEFAULT 0
);

-- Inicializar la secuencia para las empresas existentes
INSERT INTO public.tenant_sequences (tenant_id, last_sku_seq)
SELECT id, 0 FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- 4. Crear la función del Trigger para auto-generar SKU
CREATE OR REPLACE FUNCTION public.auto_generate_sku()
RETURNS TRIGGER
SECURITY DEFINER -- ¡MUY IMPORTANTE! Esto permite que el trigger se salte las reglas RLS
AS $$
DECLARE
  v_prefix TEXT;
  v_next_val INTEGER;
BEGIN
  -- Si el SKU viene vacío o nulo
  IF NEW.sku IS NULL OR trim(NEW.sku) = '' THEN
    
    -- Obtener el prefijo de la empresa
    SELECT tenant_prefix INTO v_prefix FROM public.tenants WHERE id = NEW.tenant_id;
    IF v_prefix IS NULL OR v_prefix = '' THEN
      v_prefix := 'emp';
    END IF;

    -- Obtener e incrementar el correlativo (bloqueando la fila para evitar concurrencia)
    UPDATE public.tenant_sequences 
    SET last_sku_seq = last_sku_seq + 1 
    WHERE tenant_id = NEW.tenant_id 
    RETURNING last_sku_seq INTO v_next_val;

    -- Si por alguna razón no existía la fila en tenant_sequences, la creamos
    IF v_next_val IS NULL THEN
      INSERT INTO public.tenant_sequences (tenant_id, last_sku_seq) 
      VALUES (NEW.tenant_id, 1) 
      RETURNING last_sku_seq INTO v_next_val;
    END IF;

    -- Asignar el nuevo SKU (ej: flc000001)
    NEW.sku := v_prefix || lpad(v_next_val::text, 6, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear el Trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_sku ON public.products;

CREATE TRIGGER trigger_auto_generate_sku
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_sku();
