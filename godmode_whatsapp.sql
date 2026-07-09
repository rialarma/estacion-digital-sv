CREATE OR REPLACE FUNCTION public.godmode_send_whatsapp(p_tenant_id UUID, p_phone VARCHAR, p_message TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.jwt() ->> 'email' NOT IN ('raam2508@gmail.com', 'admin@estaciondigital.sv') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.whatsapp_queue (tenant_id, phone_number, message_body, status)
  VALUES (p_tenant_id, p_phone, p_message, 'pending');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
