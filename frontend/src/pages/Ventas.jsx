import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Save, Info } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';

// Genera un UUID v4 simple para el código de generación del DTE
const generarCodigoGeneracion = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
};

const Ventas = () => {
  const { tenantInfo } = useTenantStore();
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProducts();
    fetchClients();
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    const { data } = await supabase.from('sellers').select('*').order('name');
    if (data) setSellers(data);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    // Productos ahora sin 'stock' en la tabla - el stock está en 'inventory'
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, cost, sku');
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleAdd = () => {
    if (!selectedProductId) return;
    
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    // Check if already in list
    const existingItem = items.find(i => i.id === product.id);
    if (existingItem) {
      setItems(items.map(i => 
        i.id === product.id 
          ? { ...i, quantity: i.quantity + quantity, total: (i.quantity + quantity) * i.price }
          : i
      ));
    } else {
      setItems([...items, {
        id: product.id,
        name: product.name,
        price: product.price,
        cost: product.cost,
        quantity: quantity,
        total: product.price * quantity
      }]);
    }

    setSelectedProductId('');
    setQuantity(1);
  };

  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };

  const totalOrder = items.reduce((acc, curr) => acc + curr.total, 0);
  const totalConIva = totalOrder * 1.13;

  const handleSaveOrder = async () => {
    if (items.length === 0) return;
    if (!selectedSellerId) {
      alert("Debes seleccionar un Vendedor para registrar la venta.");
      return;
    }
    setSaving(true);

    try {
      // 1. Obtener perfil del usuario (tenant_id y branch_id)
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) throw new Error('No hay sesión activa.');

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id, branch_id')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('No se pudo obtener el perfil de empresa. Asegúrate de haber completado el Onboarding.');
      }

      const { tenant_id, branch_id } = profile;

      // 2. Calcular totales
      const subtotal = totalOrder;
      const taxRate = tenantInfo?.tax_iva ? (tenantInfo.tax_iva / 100) : 0.13;
      const tax_iva = parseFloat((subtotal * taxRate).toFixed(2));
      const total = parseFloat((subtotal + tax_iva).toFixed(2));
      const dteTipo = selectedClientId ? '03' : '01'; // 03=CCF, 01=FCF
      const codigoGeneracion = crypto.randomUUID();

      // 3. Crear la Venta en la tabla 'sales'
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          tenant_id,
          branch_id,
          client_id: selectedClientId || null,
          seller_id: selectedSellerId,
          cashier_id: userId,
          subtotal,
          tax_iva,
          total,
          status: 'COMPLETADA',
          payment_method: 'EFECTIVO',
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 4. Crear el DTE asociado a esa venta en la tabla 'dtes'
      const { error: dteError } = await supabase
        .from('dtes')
        .insert([{
          tenant_id,
          sale_id: sale.id,
          dte_type: dteTipo,
          codigo_generacion: codigoGeneracion,
          status: 'PENDIENTE',
          sello_recepcion: null,
          json_firmado: null,
          observaciones: null,
        }]);

      if (dteError) throw dteError;

      // 4.5 Registrar los items de la venta
      const saleItemsData = items.map(item => ({
        tenant_id,
        sale_id: sale.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
        unit_cost: item.cost || 0,
        subtotal: item.total
      }));
      
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsData);
      if (itemsError) throw itemsError;

      // 4.6 Descontar del inventario
      for (const item of items) {
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, stock')
          .eq('product_id', item.id)
          .eq('branch_id', branch_id)
          .single();

        if (existing) {
          await supabase
            .from('inventory')
            .update({ stock: existing.stock - item.quantity, last_updated: new Date().toISOString() })
            .eq('id', existing.id);
        }
      }

      // 5. Éxito
      const tipoLabel = dteTipo === '03' ? 'CCF' : 'FCF';
      alert(`✅ ${tipoLabel} creado con estado PENDIENTE.\nCódigo: ${codigoGeneracion}\n\nVe a Documentos para continuar el flujo de firma.`);
      setItems([]);
      setSelectedClientId('');

    } catch (err) {
      console.error('Error al emitir documento:', err);
      alert('Error al emitir: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Ventas (POS)</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Left side: Form & Current Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>1. Datos de la Venta</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Cliente</label>
                <select 
                  className="glass-input"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">Consumidor Final (Sin nombre)</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.document_number || 'Sin Doc'})</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Vendedor *</label>
                <select 
                  className="glass-input"
                  value={selectedSellerId}
                  onChange={(e) => setSelectedSellerId(e.target.value)}
                  required
                >
                  <option value="">-- Selecciona Vendedor --</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>2. Agregar Producto</h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                <label>Producto del Inventario</label>
                <select 
                  className="glass-input"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={loading || products.length === 0}
                >
                  <option value="">Selecciona un producto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toFixed(2)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Cantidad</label>
                <input 
                  type="number" 
                  className="glass-input" 
                  min="1" 
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              <button className="glass-button" onClick={handleAdd} disabled={!selectedProductId}>
                <Plus size={18} /> Agregar
              </button>
            </div>
            {products.length === 0 && !loading && (
              <p style={{ marginTop: '12px', fontSize: '14px', color: '#fbbf24' }}>
                No tienes productos en tu inventario. Ve a "Inventario" a crear algunos.
              </p>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Detalle del Pedido</h3>
            {items.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                <p>No hay productos en el pedido actual.</p>
              </div>
            ) : (
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.name}</td>
                      <td>{item.quantity}</td>
                      <td>${Number(item.price).toFixed(2)}</td>
                      <td>${Number(item.total).toFixed(2)}</td>
                      <td>
                        <button 
                          onClick={() => removeItem(item.id)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}>
                          X
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right side: Summary */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>Resumen</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
            <span>${totalOrder.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <span style={{ color: 'var(--text-muted)' }}>IVA ({(tenantInfo?.tax_iva || 13)}%):</span>
            <span>${(totalOrder * (tenantInfo?.tax_iva ? tenantInfo.tax_iva/100 : 0.13)).toFixed(2)}</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '16px', 
            borderTop: '1px solid var(--border-color)',
            marginBottom: '24px'
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>Total:</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
              ${(totalOrder * (1 + (tenantInfo?.tax_iva ? tenantInfo.tax_iva/100 : 0.13))).toFixed(2)}
            </span>
          </div>
          <button
            className="glass-button"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={items.length === 0 || saving || !selectedSellerId}
            onClick={handleSaveOrder}
          >
            <Save size={18} /> {saving ? 'Enviando...' : 'Emitir Documento'}
          </button>

          {/* Nota sobre el estado inicial del DTE */}
          <div style={{
            marginTop: '16px',
            padding: '10px 12px',
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}>
            <Info size={14} color="#fbbf24" style={{ marginTop: '1px', flexShrink: 0 }} />
            <span>
              El documento se creará en estado <strong style={{ color: '#fbbf24' }}>Pendiente</strong>.
              El firmador lo sellará cuando Hacienda lo apruebe.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ventas;
