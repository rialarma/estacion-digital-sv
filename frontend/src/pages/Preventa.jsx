import React, { useState, useEffect } from 'react';
import { Clock, Search, ShoppingCart, Send, Save, User, MapPin, Truck, Plus, Minus, FileText, CheckCircle, Navigation, PackageOpen, X, WifiOff, RefreshCw, UserCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { useAuth } from '../hooks/useAuth';
import PageHeader from '../components/PageHeader';

const Preventa = () => {
  const { tenantInfo } = useTenantStore();
  const { user } = useAuth();
  
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Selection State
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showCart, setShowCart] = useState(false);

  // Offline / Network State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // Attendance logic
  const [activeShift, setActiveShift] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  useEffect(() => {
    if (tenantInfo?.id) {
      fetchProducts();
      fetchClients();
      fetchActiveShift();
    }
  }, [tenantInfo]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineOrders();
    };
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const savedOrders = JSON.parse(localStorage.getItem('offline_orders') || '[]');
    setPendingOrders(savedOrders);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineOrders = async () => {
    if (syncing || !navigator.onLine) return;
    const savedOrders = JSON.parse(localStorage.getItem('offline_orders') || '[]');
    if (savedOrders.length === 0) return;

    setSyncing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id, branch_id').eq('id', userData.user.id).single();

      for (const order of savedOrders) {
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .insert([{
            tenant_id: profile.tenant_id,
            branch_id: profile.branch_id,
            client_id: order.client_id,
            seller_id: userData.user.id,
            subtotal: order.subtotal,
            tax_amount: order.tax_amount,
            total: order.total,
            valid_until: order.valid_until,
            status: 'PENDING_PEDIDO'
          }])
          .select()
          .single();

        if (quoteError) continue;

        const quoteItemsData = order.items.map(item => ({
          tenant_id: profile.tenant_id,
          quote_id: quote.id,
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price,
          subtotal: item.total
        }));

        await supabase.from('quote_items').insert(quoteItemsData);
      }
      
      localStorage.removeItem('offline_orders');
      setPendingOrders([]);
      alert(`✅ ${savedOrders.length} pedidos sincronizados exitosamente con la central.`);
    } catch (e) {
      console.error("Sync error:", e);
    }
    setSyncing(false);
  };

  const fetchActiveShift = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: shiftData } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('user_id', userData.user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveShift(shiftData || null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('employee_attendance')
        .insert([{ tenant_id: tenantInfo.id, user_id: userData.user.id }])
        .select()
        .single();
      if (!error && data) setActiveShift(data);
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('employee_attendance')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', activeShift.id);
      if (!error) setActiveShift(null);
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const fetchProducts = async () => {
    setLoading(true);
    if (!navigator.onLine) {
      const offline = JSON.parse(localStorage.getItem('offline_products') || '[]');
      setProducts(offline);
      setLoading(false);
      return;
    }

    try {
      const { data: prodData } = await supabase.from('products').select('id, name, price, sku, units_per_box, box_price, is_service, is_subscription, subscription_days').eq('tenant_id', tenantInfo.id).order('name');
      const { data: invData } = await supabase.from('inventory').select('product_id, stock').eq('tenant_id', tenantInfo.id);
      if (prodData) {
        const merged = prodData.map(p => {
          const inv = invData?.find(i => i.product_id === p.id);
          return { ...p, stock: inv ? inv.stock : 0 };
        });
        setProducts(merged);
        localStorage.setItem('offline_products', JSON.stringify(merged));
      }
    } catch (e) {
      setProducts(JSON.parse(localStorage.getItem('offline_products') || '[]'));
    }
    setLoading(false);
  };

  const fetchClients = async () => {
    if (!navigator.onLine) {
      setClients(JSON.parse(localStorage.getItem('offline_clients') || '[]'));
      return;
    }
    try {
      const { data } = await supabase.from('clients').select('id, name, business_name').eq('tenant_id', tenantInfo.id).order('name');
      if (data) {
        const uniqueClients = [];
        const seen = new Set();
        for (const c of data) {
          if (!seen.has(c.name)) {
            seen.add(c.name);
            uniqueClients.push(c);
          }
        }
        setClients(uniqueClients);
        localStorage.setItem('offline_clients', JSON.stringify(uniqueClients));
      }
    } catch (e) {
      setClients(JSON.parse(localStorage.getItem('offline_clients') || '[]'));
    }
  };

  const handleAddProduct = (product) => {
    const existingItem = items.find(i => i.id === product.id && i.sale_type === 'UNIDAD');
    const currentQty = existingItem ? existingItem.quantity : 0;
    
    const isStockRestricted = !product.is_service && !product.is_subscription && tenantInfo?.allow_negative_stock === false;
    
    if (isStockRestricted && currentQty >= product.stock) {
      alert(`No hay stock suficiente. Stock actual: ${product.stock}`);
      return;
    }
    
    if (existingItem) {
      setItems(items.map(i => 
        i.id === product.id && i.sale_type === 'UNIDAD'
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
          : i
      ));
    } else {
      setItems([...items, {
        id: product.id,
        name: product.name,
        price: product.price,
        units_per_box: product.units_per_box || 1,
        box_price: product.box_price || product.price,
        is_taxable: product.is_taxable !== false,
        sale_type: 'UNIDAD',
        quantity: 1,
        total: product.price * 1
      }]);
    }
  };

  const updateQuantity = (index, delta) => {
    const newItems = [...items];
    const item = newItems[index];
    const product = products.find(p => p.id === item.id) || {};
    const newQty = item.quantity + delta;
    
    if (delta > 0) { // Incrementando
      const isStockRestricted = !product.is_service && !product.is_subscription && tenantInfo?.allow_negative_stock === false;
      const currentStock = product.stock || 0;
      
      if (isStockRestricted && newQty > currentStock) {
        alert(`No hay stock suficiente. Stock actual: ${currentStock}`);
        return;
      }
    }

    if (newQty < 1) {
      newItems.splice(index, 1);
    } else {
      item.quantity = newQty;
      item.total = newQty * item.price;
    }
    setItems(newItems);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalOrder = items.reduce((acc, curr) => acc + curr.total, 0);
  const taxRate = tenantInfo?.tax_iva ? (tenantInfo.tax_iva / 100) : 0.13;
  
  const tax_iva = items.reduce((acc, curr) => {
    if (curr.is_taxable) {
      return acc + (curr.total - (curr.total / (1 + taxRate)));
    }
    return acc;
  }, 0);
  
  const subtotal = totalOrder - tax_iva;
  const total = totalOrder;
  const totalItemsCount = items.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      alert("Agrega productos al pedido.");
      return;
    }
    if (!selectedClientId) {
      alert("Por favor selecciona un cliente.");
      setShowCart(false);
      return;
    }
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 15); // Preventas validas por 15 dias

    if (!navigator.onLine) {
      const newOrder = {
        id: Date.now(),
        client_id: selectedClientId,
        items: items,
        subtotal: subtotal,
        tax_amount: tax_iva,
        total: total,
        valid_until: validUntil.toISOString()
      };
      const updatedPending = [...pendingOrders, newOrder];
      localStorage.setItem('offline_orders', JSON.stringify(updatedPending));
      setPendingOrders(updatedPending);
      
      alert("📶 Sin conexión: Pedido guardado en la memoria del teléfono. Se enviará automáticamente cuando recupere la señal.");
      setItems([]);
      setSelectedClientId('');
      setShowCart(false);
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id, branch_id').eq('id', userData.user.id).single();

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          tenant_id: profile.tenant_id,
          branch_id: profile.branch_id,
          client_id: selectedClientId,
          seller_id: userData.user.id, // Vendedor logueado
          subtotal: subtotal,
          tax_amount: tax_iva,
          total: total,
          valid_until: validUntil.toISOString(),
          status: 'PENDING_PEDIDO'
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      const quoteItemsData = items.map(item => ({
        tenant_id: profile.tenant_id,
        quote_id: quote.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.total
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(quoteItemsData);
      if (itemsError) throw itemsError;

      alert(`✅ Pedido enviado exitosamente.`);
      setItems([]);
      setSelectedClientId('');
      setShowCart(false);
    } catch (err) {
      alert("Error enviando pedido: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Fijo */}
      <div style={{ 
        position: 'sticky', top: 0, zIndex: 50, 
        background: 'var(--bg-app)', padding: '16px', 
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'
      }}>
        {isOffline && (
          <div style={{ background: '#eab308', color: '#000', padding: '8px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            <WifiOff size={18} /> MODO OFFLINE ACTIVADO (Sin internet)
          </div>
        )}
        
        {!isOffline && pendingOrders.length > 0 && (
          <div style={{ background: '#3b82f6', color: '#fff', padding: '8px', borderRadius: '8px', marginBottom: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 'bold' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PackageOpen size={18} /> {pendingOrders.length} pedido(s) pendiente(s) de envío
            </div>
            <button onClick={syncOfflineOrders} disabled={syncing} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RefreshCw size={14} className={syncing ? 'spin' : ''} /> {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>
        )}
        <PageHeader title="Punto de Preventa" icon={ShoppingCart}>
          <button 
            onClick={activeShift ? handleClockOut : handleClockIn}
            disabled={actionLoading}
            style={{
              background: activeShift ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: activeShift ? '#ef4444' : '#10b981',
              border: `1px solid ${activeShift ? '#ef4444' : '#10b981'}`,
              padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              fontWeight: 'bold', transition: 'all 0.3s'
            }}
          >
            <UserCheck size={16} /> 
            {actionLoading ? 'Cargando...' : (activeShift ? 'Cerrar Turno' : 'Marcar Ingreso')}
          </button>
        </PageHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Client Selector */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border-color)' }}>
            <User size={18} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <select 
              value={selectedClientId} 
              onChange={e => setSelectedClientId(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '14px' }}
            >
              <option value="" style={{ color: '#000' }}>-- Seleccionar Cliente --</option>
              {clients.map(c => <option key={c.id} value={c.id} style={{ color: '#000' }}>{c.name} {c.business_name ? `(${c.business_name})` : ''}</option>)}
            </select>
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 12px', border: '1px solid var(--border-color)' }}>
            <Search size={18} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '14px' }}
            />
          </div>
        </div>
      </div>

      {/* Product List */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando catálogo...</div>
        ) : filteredProducts.map(product => {
          const cartItem = items.find(i => i.id === product.id);
          const qtyInCart = cartItem ? cartItem.quantity : 0;
          
          return (
            <div key={product.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px' }}>
              <div style={{ flex: 1, paddingRight: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', lineHeight: '1.3' }}>{product.name}</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>SKU: {product.sku || 'N/A'}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--primary)' }}>${product.price.toFixed(2)}</div>
              </div>
              
              {qtyInCart > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '24px', padding: '4px' }}>
                  <button 
                    onClick={() => updateQuantity(items.findIndex(i => i.id === product.id), -1)}
                    style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                  >
                    <Minus size={16} />
                  </button>
                  <span style={{ width: '32px', textAlign: 'center', fontWeight: 'bold' }}>{qtyInCart}</span>
                  <button 
                    onClick={() => handleAddProduct(product)}
                    style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ) : (
                <button 
                  className="glass-button" 
                  style={{ padding: '8px 16px', borderRadius: '24px', background: 'var(--primary)' }}
                  onClick={() => handleAddProduct(product)}
                >
                  Agregar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Bar (Trigger) */}
      {items.length > 0 && !showCart && (
        <div style={{ 
          position: 'fixed', bottom: '16px', left: '16px', right: '16px', 
          background: 'var(--primary)', borderRadius: '30px', padding: '16px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)', color: '#fff', zIndex: 100,
          cursor: 'pointer'
        }} onClick={() => setShowCart(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold' }}>
              {totalItemsCount} items
            </div>
            <span style={{ fontWeight: 600 }}>Ver Carrito</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            ${total.toFixed(2)}
          </div>
        </div>
      )}

      {/* Fullscreen Cart Bottom Sheet Modal */}
      {showCart && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'
        }}>
          <div style={{
            background: 'var(--bg-app)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '24px', display: 'flex', flexDirection: 'column', maxHeight: '85vh',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PackageOpen size={24} color="var(--primary)" /> Resumen del Pedido
              </h2>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
              {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>${item.price.toFixed(2)} c/u</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>${item.total.toFixed(2)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '2px' }}>
                      <button onClick={() => updateQuantity(index, -1)} style={{ background: 'none', border: 'none', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}><Minus size={14} /></button>
                      <span style={{ width: '24px', textAlign: 'center', fontSize: '14px' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(index, 1)} style={{ background: 'none', border: 'none', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)' }}><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <span>Subtotal (Sin IVA):</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <span>IVA ({tenantInfo?.tax_iva || 13}%):</span>
                <span>${tax_iva.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                <span>Total a Cobrar:</span>
                <span>${total.toFixed(2)}</span>
              </div>

              <button 
                className="glass-button" 
                style={{ width: '100%', background: '#10b981', display: 'flex', justifyContent: 'center', padding: '16px', fontSize: '16px', borderRadius: '12px' }} 
                onClick={handleSubmitOrder} 
                disabled={saving}
              >
                <Save size={20} style={{ marginRight: '8px' }} /> {saving ? 'Enviando...' : 'Enviar Pedido a Central'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Preventa;
