-- ATENCIÓN: Este script borrará ABSOLUTAMENTE TODOS los datos del sistema.

-- 1. Vaciar la tabla raíz (tenants). 
-- Al usar CASCADE, PostgreSQL automáticamente vaciará TODAS las tablas 
-- que dependan de esta (productos, ventas, compras, sucursales, etc.)
TRUNCATE TABLE public.tenants CASCADE;

-- 2. Borrar todos los usuarios registrados del sistema de Autenticación de Supabase
DELETE FROM auth.users;

-- ¡Listo! El sistema está como recién instalado.
