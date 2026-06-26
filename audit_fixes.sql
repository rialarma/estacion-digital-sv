-- Drivers
DROP POLICY IF EXISTS "Tenants can view their own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Tenants can insert their own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Tenants can update their own drivers" ON public.drivers;
DROP POLICY IF EXISTS "Tenants can delete their own drivers" ON public.drivers;

CREATE POLICY "Tenants can view their own drivers" ON public.drivers FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can insert their own drivers" ON public.drivers FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can update their own drivers" ON public.drivers FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can delete their own drivers" ON public.drivers FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- Web Orders
DROP POLICY IF EXISTS "Tenants can view their own web_orders" ON public.web_orders;
DROP POLICY IF EXISTS "Tenants can update their own web_orders" ON public.web_orders;
DROP POLICY IF EXISTS "Tenants can view their own web_order_items" ON public.web_order_items;

CREATE POLICY "Tenants can view their own web_orders" ON public.web_orders FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can update their own web_orders" ON public.web_orders FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can view their own web_order_items" ON public.web_order_items FOR SELECT USING (web_order_id IN (SELECT id FROM public.web_orders WHERE tenant_id = public.get_auth_tenant_id()));

-- Sellers
DROP POLICY IF EXISTS "Tenants can view their own sellers" ON public.sellers;
DROP POLICY IF EXISTS "Tenants can insert their own sellers" ON public.sellers;
DROP POLICY IF EXISTS "Tenants can update their own sellers" ON public.sellers;
DROP POLICY IF EXISTS "Tenants can delete their own sellers" ON public.sellers;

CREATE POLICY "Tenants can view their own sellers" ON public.sellers FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can insert their own sellers" ON public.sellers FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can update their own sellers" ON public.sellers FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can delete their own sellers" ON public.sellers FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- purchase_items
DROP POLICY IF EXISTS "Tenants can view their own purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Tenants can insert their own purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Tenants can update their own purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Tenants can delete their own purchase_items" ON public.purchase_items;

CREATE POLICY "Tenants can view their own purchase_items" ON public.purchase_items FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can insert their own purchase_items" ON public.purchase_items FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can update their own purchase_items" ON public.purchase_items FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can delete their own purchase_items" ON public.purchase_items FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- sale_items
DROP POLICY IF EXISTS "Tenants can view their own sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Tenants can insert their own sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Tenants can update their own sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Tenants can delete their own sale_items" ON public.sale_items;

CREATE POLICY "Tenants can view their own sale_items" ON public.sale_items FOR SELECT USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can insert their own sale_items" ON public.sale_items FOR INSERT WITH CHECK (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can update their own sale_items" ON public.sale_items FOR UPDATE USING (tenant_id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can delete their own sale_items" ON public.sale_items FOR DELETE USING (tenant_id = public.get_auth_tenant_id());

-- tenants
DROP POLICY IF EXISTS "Tenants can view their own profile" ON public.tenants;
DROP POLICY IF EXISTS "Tenants can update their own profile" ON public.tenants;

CREATE POLICY "Tenants can view their own profile" ON public.tenants FOR SELECT USING (id = public.get_auth_tenant_id());
CREATE POLICY "Tenants can update their own profile" ON public.tenants FOR UPDATE USING (id = public.get_auth_tenant_id());
