CREATE TABLE IF NOT EXISTS public.bot_status (
  id INT PRIMARY KEY DEFAULT 1,
  status VARCHAR(20) DEFAULT 'DISCONNECTED', -- CONNECTED, QR_READY, DISCONNECTED
  last_ping TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.bot_status ENABLE ROW LEVEL SECURITY;

-- Allow reading access for everyone (for the UI)
CREATE POLICY "Enable select for everyone" ON public.bot_status FOR SELECT USING (true);

-- Allow bot to update and insert
CREATE POLICY "Enable insert for anon" ON public.bot_status FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for anon" ON public.bot_status FOR UPDATE USING (true);

-- Initialize the first record if it doesn't exist
INSERT INTO public.bot_status (id, status) VALUES (1, 'DISCONNECTED') ON CONFLICT (id) DO NOTHING;
