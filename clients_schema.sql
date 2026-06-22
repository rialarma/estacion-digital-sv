CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  document_type TEXT DEFAULT 'NIT', -- NIT, DUI, NRC
  document_number TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas para clients
CREATE POLICY "Users can view their tenant's clients" ON public.clients
  FOR SELECT USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can insert their tenant's clients" ON public.clients
  FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can update their tenant's clients" ON public.clients
  FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can delete their tenant's clients" ON public.clients
  FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Modificar tabla orders para aceptar cliente
ALTER TABLE public.orders 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;
