-- Habilitar la creación de buckets si no está instalado
-- (Usualmente Supabase Storage ya está configurado por defecto, pero nos aseguramos)

-- 1. Crear el bucket público para imágenes de productos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas antiguas si existieran
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Users Upload" ON storage.objects;

-- 3. Crear política de lectura pública (Cualquiera en internet puede ver las fotos de los productos)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'product_images');

-- 4. Crear política de escritura (Solo usuarios autenticados en el ERP pueden subir fotos)
CREATE POLICY "Auth Users Upload" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);

-- 5. Crear política de actualización/reemplazo
CREATE POLICY "Auth Users Update" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'product_images' 
  AND auth.role() = 'authenticated'
);
