-- 1. Remover supplier_code de products ya que ahora se usará el supplier_id
ALTER TABLE public.products DROP COLUMN IF EXISTS supplier_code;

-- 2. Agregar código a proveedores
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS code TEXT;

-- 3. Modificar la tabla de secuencias para incluir el correlativo de proveedores
ALTER TABLE public.tenant_sequences ADD COLUMN IF NOT EXISTS last_supplier_seq INTEGER DEFAULT 0;

-- 4. Crear la función del Trigger para auto-generar código de proveedor
CREATE OR REPLACE FUNCTION public.auto_generate_supplier_code()
RETURNS TRIGGER
SECURITY DEFINER -- Permite saltar RLS
AS $$
DECLARE
  v_prefix TEXT;
  v_next_val INTEGER;
BEGIN
  -- Si el código viene vacío o nulo
  IF NEW.code IS NULL OR trim(NEW.code) = '' THEN
    
    -- Obtener el prefijo de la empresa
    SELECT tenant_prefix INTO v_prefix FROM public.tenants WHERE id = NEW.tenant_id;
    IF v_prefix IS NULL OR v_prefix = '' THEN
      v_prefix := 'emp';
    END IF;

    -- Obtener e incrementar el correlativo (bloqueando la fila para evitar concurrencia)
    UPDATE public.tenant_sequences 
    SET last_supplier_seq = last_supplier_seq + 1 
    WHERE tenant_id = NEW.tenant_id 
    RETURNING last_supplier_seq INTO v_next_val;

    -- Si no existía fila (muy raro porque el trigger de SKU la debió crear, pero por si acaso)
    IF v_next_val IS NULL THEN
      INSERT INTO public.tenant_sequences (tenant_id, last_sku_seq, last_supplier_seq) 
      VALUES (NEW.tenant_id, 0, 1) 
      RETURNING last_supplier_seq INTO v_next_val;
    END IF;

    -- Asignar el nuevo Código (ej: flc-P001)
    NEW.code := v_prefix || '-P' || lpad(v_next_val::text, 3, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear el Trigger para la tabla de proveedores
DROP TRIGGER IF EXISTS trigger_auto_generate_supplier_code ON public.suppliers;

CREATE TRIGGER trigger_auto_generate_supplier_code
BEFORE INSERT ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.auto_generate_supplier_code();
