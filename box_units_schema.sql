-- ==========================================
-- ACTUALIZACIÓN DE PRODUCTOS: CAJAS Y UNIDADES
-- ==========================================

-- Añadir campos para manejo de Cajas a la tabla de productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS units_per_box INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS box_price NUMERIC(10, 2) DEFAULT 0;

-- Asegurarnos de que nadie tenga valores nulos que rompan la app
UPDATE public.products SET units_per_box = 1 WHERE units_per_box IS NULL OR units_per_box < 1;
UPDATE public.products SET box_price = price WHERE box_price IS NULL OR box_price = 0;
