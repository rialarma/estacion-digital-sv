-- ==============================================================
-- ACTUALIZACIÓN DE HORARIOS (SÁBADO Y DOMINGO)
-- ==============================================================

-- Agregar campos para horarios de Sábado y Domingo
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS saturday_shift_start TIME,
ADD COLUMN IF NOT EXISTS saturday_shift_end TIME,
ADD COLUMN IF NOT EXISTS sunday_shift_start TIME,
ADD COLUMN IF NOT EXISTS sunday_shift_end TIME;
