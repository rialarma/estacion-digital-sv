CREATE OR REPLACE FUNCTION public.admin_exit_support()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.jwt() ->> 'email' NOT IN ('raam2508@gmail.com', 'admin@estaciondigital.sv') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.user_profiles WHERE id = auth.uid();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
