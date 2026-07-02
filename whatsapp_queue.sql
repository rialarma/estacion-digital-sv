-- Create WhatsApp Queue Table
CREATE TABLE IF NOT EXISTS public.whatsapp_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  message_body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_queue ENABLE ROW LEVEL SECURITY;

-- Allow public insertion for order confirmations
CREATE POLICY "Enable insert for everyone" ON public.whatsapp_queue FOR INSERT WITH CHECK (true);

-- Allow reading and updating for the bot (using anon key for now)
CREATE POLICY "Enable select for everyone" ON public.whatsapp_queue FOR SELECT USING (true);
CREATE POLICY "Enable update for everyone" ON public.whatsapp_queue FOR UPDATE USING (true);

-- Enable Realtime for whatsapp_queue
alter publication supabase_realtime add table public.whatsapp_queue;
