-- ==============================================================
-- MÓDULO AVANZADO DE ASISTENCIA Y KIOSKO
-- ==============================================================

-- 1. Actualizar user_profiles para Kiosko y Puntualidad
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS pin VARCHAR(4),
ADD COLUMN IF NOT EXISTS shift_start TIME,
ADD COLUMN IF NOT EXISTS shift_end TIME;

-- 2. Actualizar employee_attendance para Seguridad y GPS
ALTER TABLE public.employee_attendance
ADD COLUMN IF NOT EXISTS location_lat NUMERIC(10,8),
ADD COLUMN IF NOT EXISTS location_lng NUMERIC(11,8),
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE;

-- 3. Crear función RPC para Kiosko (opcional para chequear PIN de forma segura)
-- Es mejor que el frontend haga la consulta directa si el RLS lo permite.
-- Dado que RLS aísla por tenant, el kiosko (logueado en el tenant) puede consultar user_profiles y hacer match del PIN.
