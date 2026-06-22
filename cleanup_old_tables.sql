-- Script para limpiar tablas de la versión anterior que ya no usamos.
-- ADVERTENCIA: Esto borrará los datos de esas tablas. 
-- Como estamos empezando de cero con la nueva estructura, esto es seguro.

DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
-- Mantenemos products y clients ya que podríamos requerirlos si no se crearon de nuevo con tenant_id, 
-- pero en el nuevo esquema v2 ya recreaste products y clients con tenant_id. 
-- Así que si existían tablas viejas que no tenían tenant_id, aquí es donde chocarían.
-- En supabase_schema_v2 usamos `CREATE TABLE IF NOT EXISTS`, por lo que si tenías tablas "products" viejas sin tenant_id, fallará.
-- Para garantizar un lienzo en blanco:
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.purchases CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.dtes CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Nota: Si ejecutas este archivo, tendrás que volver a correr el `supabase_schema_v2.sql` para recrear las tablas multi-tenant limpias.
