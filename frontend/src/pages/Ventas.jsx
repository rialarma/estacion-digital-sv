import React, { useState, useEffect } from 'react';
import { ShoppingCart, Save, Lock, Monitor, Plus, Info } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import ProductSearch from '../components/ProductSearch';
import { printDocument } from '../utils/printUtils';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CONTADO');
  
  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);

  useEffect(() => {
    fetchActiveShift();
    fetchProducts();
    fetchClients();
    fetchSellers();
    fetchDrivers();
  }, []);

  useEffect(() => {
    // If products are loaded and there's a quote ID in URL, load it
    const quoteId = searchParams.get('quote');
    if (quoteId && products.length > 0) {
      loadQuote(quoteId);
    }
  }, [searchParams, products]);

  const loadQuote = async (quoteId) => {
    setLoading(true);
    try {
      const { data: quote } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
      if (quote) {
        setSelectedClientId(quote.client_id || '');
        setSelectedSellerId(quote.seller_id || '');
        
        const { data: qItems } = await supabase.from('quote_items').select('*').eq('quote_id', quoteId);
        if (qItems && qItems.length > 0) {
          const newItems = qItems.map(qi => {
            const prod = products.find(p => p.id === qi.product_id);
            return {
              id: qi.product_id,
              name: prod ? prod.name : 'Producto Eliminado',
              price: qi.unit_price,
              cost: prod ? prod.cost : 0,
              quantity: qi.quantity,
              total: qi.subtotal
            };
          });
          setItems(newItems);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchActiveShift = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    
    const { data: shift } = await supabase
      .from('cash_shifts')
      .select('id')
      .eq('cashier_id', userData.user.id)
      .eq('status', 'OPEN')
      .single();
      
    setActiveShift(shift);
  };

  const fetchSellers = async () => {
    const { data } = await supabase.from('sellers').select('*').order('name');
    if (data) setSellers(data);
  };

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*').order('name');
    if (data) setDrivers(data);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, price, cost, sku, units_per_box, box_price, is_service');
    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleSelectProduct = (product) => {
    const existingItem = items.find(i => i.id === product.id && i.sale_type === 'UNIDAD');
    
    if (existingItem) {
      // Increase quantity by 1
      const newQty = existingItem.quantity + 1;
      setItems(items.map(i => 
        i.id === product.id && i.sale_type === 'UNIDAD'
          ? { ...i, quantity: newQty, total: newQty * i.price }
          : i
      ));
    } else {
      // Add new unit
      setItems([...items, {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        cost: Number(product.cost) || 0,
        units_per_box: product.units_per_box || 1,
        box_price: product.box_price || product.price,
        is_service: product.is_service || false,
        sale_type: 'UNIDAD',
        quantity: 1,
        total: Number(product.price) || 0
      }]);
    }
  };

  const changeQuantity = (index, qty) => {
    const newItems = [...items];
    const item = newItems[index];
    const numQty = Number(qty) || 0;
    item.quantity = numQty;
    item.total = numQty * item.price;
    setItems(newItems);
  };

  const changeSaleType = (index, type) => {
    const newItems = [...items];
    const item = newItems[index];
    item.sale_type = type;
    item.price = type === 'CAJA' ? item.box_price : (products.find(p => p.id === item.id)?.price || 0);
    item.total = item.quantity * item.price;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
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
          payment_method: paymentMethod,
          balance: paymentMethod === 'CREDITO' ? total : 0,
          shift_id: activeShift ? activeShift.id : null,
          driver_id: selectedDriverId || null,
          delivery_status: selectedDriverId ? 'PENDIENTE_DE_CARGA' : 'ENTREGADO'
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
        }]);

      if (dteError) throw dteError;

      // 5. Generar partida contable automática
      const { error: rpcError } = await supabase.rpc('create_sale_journal_entry', {
        p_sale_id: sale.id
      });
      if (rpcError) console.error("Error contabilidad:", rpcError);

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

      // 4.6 Descontar del inventario (Omitir servicios)
      for (const item of items) {
        if (item.is_service) continue; // No descontar inventario si es servicio

        const { data: existing } = await supabase
          .from('inventory')
          .select('id, stock')
          .eq('product_id', item.id)
          .eq('branch_id', branch_id)
          .single();

        if (existing) {
          // If CAJA, deduct quantity * units_per_box
          const deduction = item.sale_type === 'CAJA' ? (item.quantity * item.units_per_box) : item.quantity;
          const newStock = existing.stock - deduction;
          
          await supabase
            .from('inventory')
            .update({ stock: newStock, last_updated: new Date().toISOString() })
            .eq('id', existing.id);

          // Kardex
          await supabase.from('inventory_movements').insert([{
            tenant_id,
            branch_id,
            product_id: item.id,
            movement_type: 'OUT',
            quantity: deduction,
            previous_stock: existing.stock,
            new_stock: newStock,
            reference_id: sale.id,
            description: `Venta (POS) - ${item.quantity} ${item.sale_type}`,
            created_by: userId
          }]);
        }
      }

      // 5. Éxito
      const tipoLabel = dteTipo === '03' ? 'CCF' : 'FCF';
      
      const clientObj = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
      const sellerObj = selectedSellerId ? sellers.find(s => s.id === selectedSellerId) : null;
      
      // Store data for printing
      setLastSaleData({
        sale: {
          id: sale.id,
          created_at: new Date().toISOString(),
          dte_code: `DTE-${tipoLabel}-00000${Math.floor(Math.random() * 1000)}`, // Simulate DTE
          subtotal: subtotal,
          tax_amount: tax_iva,
          total: total,
          clients: clientObj,
          sellers: sellerObj
        },
        items: items.map(item => ({
          ...item,
          products: { name: item.name } // Reconstruct product obj
        }))
      });

      setPrintModalOpen(true);

      setItems([]);
      setSelectedClientId('');
      setSelectedDriverId('');
      setPaymentMethod('CONTADO');
      
      const quoteId = searchParams.get('quote');
      if (quoteId) {
        await supabase.from('quotes').update({ status: 'CONVERTED' }).eq('id', quoteId);
        navigate('/ventas'); // Clear URL
      }
    } catch (err) {
      console.error('Error al emitir documento:', err);
      alert('Error al emitir: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando inventario y clientes...</div>;
  }

  if (!activeShift) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Lock size={64} style={{ color: '#ef4444', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Turno de Caja Cerrado</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Para poder facturar, necesitas realizar la apertura de caja.</p>
        <Link to="/caja" className="glass-button" style={{ background: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={18} /> Ir a Gestión de Caja
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Ventas (POS)</h1>
      </div>

      <div className="grid-2-1" style={{ alignItems: 'flex-start' }}>
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
            <div style={{ marginTop: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Método de Pago</label>
                <select 
                  className="glass-input"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CONTADO">Contado (Efectivo/Banco)</option>
                  <option value="CREDITO">Crédito (Cuentas por Cobrar)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Repartidor / Ruta (Opcional)</label>
                <select 
                  className="glass-input" 
                  value={selectedDriverId} 
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  <option value="">-- Entregado en tienda --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.plate_number ? `(${d.plate_number})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Detalle del Pedido</h3>
            <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Construir Venta</h2>
            
            <div style={{ marginBottom: '24px', zIndex: 10 }}>
              <ProductSearch products={products} onSelect={handleSelectProduct} />
            </div>

            <table className="glass-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Cant.</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>
                      <select 
                        className="glass-input" 
                        style={{ padding: '4px', fontSize: '12px', minWidth: '100px' }}
                        value={item.sale_type}
                        onChange={(e) => changeSaleType(index, e.target.value)}
                      >
                        <option value="UNIDAD">Unidad</option>
                        {item.units_per_box > 1 && (
                          <option value="CAJA">Caja (x{item.units_per_box})</option>
                        )}
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="1" 
                        className="glass-input" 
                        style={{ padding: '4px', width: '60px', textAlign: 'center' }}
                        value={item.quantity} 
                        onChange={e => changeQuantity(index, e.target.value)} 
                      />
                    </td>
                    <td style={{ fontWeight: 'bold' }}>${item.price.toFixed(2)}</td>
                    <td style={{ fontWeight: 'bold', color: '#10b981' }}>${item.total.toFixed(2)}</td>
                    <td>
                      <button onClick={() => removeItem(index)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {printModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ padding: '24px', width: '400px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '16px', color: '#10b981' }}>¡Venta Exitosa!</h2>
            <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>¿Deseas imprimir el comprobante para el cliente?</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="glass-button" 
                onClick={() => printDocument(lastSaleData.sale, lastSaleData.items, tenantInfo, 'TICKET')}
              >
                Imprimir Ticket (POS)
              </button>
              <button 
                className="glass-button" 
                onClick={() => printDocument(lastSaleData.sale, lastSaleData.items, tenantInfo, 'PDF')}
              >
                Imprimir PDF (Carta)
              </button>
              <button 
                className="glass-button" 
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                onClick={() => setPrintModalOpen(false)}
              >
                No Imprimir (Cerrar)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;
