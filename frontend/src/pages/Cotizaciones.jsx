import React, { useState, useEffect } from 'react';
import { FileSignature, Plus, Save, ExternalLink } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { useNavigate } from 'react-router-dom';
import ProductSearch from '../components/ProductSearch';

const Cotizaciones = () => {
  const { tenantInfo } = useTenantStore();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [validUntilDays, setValidUntilDays] = useState(15);

  useEffect(() => {
    fetchProducts();
    fetchClients();
    fetchSellers();
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    const { data } = await supabase
      .from('quotes')
      .select('*, clients(name), seller:user_profiles!quotes_seller_id_fkey(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setQuotes(data);
  };

  const fetchSellers = async () => {
    const { data } = await supabase.from('user_profiles').select('*').eq('role', 'VENDEDOR').order('first_name');
    if (data) setSellers(data);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) setClients(data);
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('id, name, price, sku, units_per_box, box_price');
    if (data) setProducts(data);
    setLoading(false);
  };

  const handleSelectProduct = (product) => {
    const existingItem = items.find(i => i.id === product.id && i.sale_type === 'UNIDAD');
    
    if (existingItem) {
      const newQty = existingItem.quantity + 1;
      setItems(items.map(i => 
        i.id === product.id && i.sale_type === 'UNIDAD'
          ? { ...i, quantity: newQty, total: newQty * i.price }
          : i
      ));
    } else {
      setItems([...items, {
        id: product.id,
        name: product.name,
        price: product.price,
        units_per_box: product.units_per_box || 1,
        box_price: product.box_price || product.price,
        sale_type: 'UNIDAD',
        quantity: 1,
        total: product.price * 1
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
  const taxRate = tenantInfo?.tax_iva ? (tenantInfo.tax_iva / 100) : 0.13;
  const tax_iva = parseFloat((totalOrder * taxRate).toFixed(2));
  const total = parseFloat((totalOrder + tax_iva).toFixed(2));

  const handleSaveQuote = async () => {
    if (items.length === 0) return;
    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id, branch_id').eq('id', userData.user.id).single();

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + parseInt(validUntilDays));

      // Insert Quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert([{
          tenant_id: profile.tenant_id,
          branch_id: profile.branch_id,
          client_id: selectedClientId || null,
          seller_id: selectedSellerId || null,
          subtotal: totalOrder,
          tax_iva: tax_iva,
          total: total,
          valid_until: validUntil.toISOString(),
          status: 'PENDING_PROFORMA'
        }])
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Insert Items
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

      alert(`✅ Cotización registrada exitosamente. Total: $${total.toFixed(2)}`);
      setItems([]);
      setSelectedClientId('');
      fetchQuotes();
      setShowHistory(true);
    } catch (err) {
      alert("Error guardando cotización: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredQuotes = quotes.filter(q => {
    if (docTypeFilter === 'ALL') return q.status.startsWith('PENDING');
    if (docTypeFilter === 'PROFORMA') return q.status === 'PENDING' || q.status === 'PENDING_PROFORMA';
    if (docTypeFilter === 'PEDIDO') return q.status === 'PENDING_PEDIDO';
    return true;
  });

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Documentos Pendientes</h1>
        <button className="glass-button" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? <Plus size={18} /> : <FileSignature size={18} />}
          {showHistory ? 'Nueva Proforma' : 'Ver Documentos Pendientes'}
        </button>
      </div>

      {showHistory ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Documentos Pendientes de Facturar</h2>
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
              <button 
                onClick={() => setDocTypeFilter('ALL')}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: docTypeFilter === 'ALL' ? 'var(--primary)' : 'transparent', color: docTypeFilter === 'ALL' ? '#fff' : 'var(--text-muted)' }}
              >Todos</button>
              <button 
                onClick={() => setDocTypeFilter('PROFORMA')}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: docTypeFilter === 'PROFORMA' ? 'var(--primary)' : 'transparent', color: docTypeFilter === 'PROFORMA' ? '#fff' : 'var(--text-muted)' }}
              >Proformas</button>
              <button 
                onClick={() => setDocTypeFilter('PEDIDO')}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: docTypeFilter === 'PEDIDO' ? 'var(--primary)' : 'transparent', color: docTypeFilter === 'PEDIDO' ? '#fff' : 'var(--text-muted)' }}
              >Pedidos (Preventa)</button>
            </div>
          </div>
          
          <div className="table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Válido Hasta</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map(q => {
                  const isPedido = q.status === 'PENDING_PEDIDO';
                  return (
                    <tr key={q.id}>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                          background: isPedido ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: isPedido ? '#10b981' : '#3b82f6'
                        }}>
                          {isPedido ? 'PEDIDO' : 'PROFORMA'}
                        </span>
                      </td>
                      <td>{new Date(q.created_at).toLocaleDateString()}</td>
                      <td>{q.clients?.name || 'Consumidor Final'}</td>
                      <td>{q.seller?.first_name} {q.seller?.last_name}</td>
                      <td>{new Date(q.valid_until).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 'bold' }}>${Number(q.total).toFixed(2)}</td>
                      <td>
                        <button 
                          className="glass-button" 
                          style={{ padding: '6px 12px', fontSize: '13px', background: '#10b981', display: 'flex', alignItems: 'center' }}
                          onClick={() => navigate(`/ventas?quote=${q.id}`)}
                        >
                          <ExternalLink size={14} style={{ marginRight: '6px' }} />
                          Facturar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredQuotes.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No hay documentos pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Builder */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Construir Proforma</h2>
            
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

          {/* Resumen */}
          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Resumen de Cotización</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cliente (Opcional)</label>
              <select className="glass-input" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                <option value="">Cliente Genérico</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Vendedor</label>
              <select className="glass-input" value={selectedSellerId} onChange={e => setSelectedSellerId(e.target.value)}>
                <option value="">-- Sin Asignar --</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Válida por (días)</label>
              <input type="number" className="glass-input" value={validUntilDays} onChange={e => setValidUntilDays(e.target.value)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: 'var(--text-muted)' }}>
              <span>Subtotal:</span>
              <span>${totalOrder.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', color: 'var(--text-muted)' }}>
              <span>IVA ({tenantInfo?.tax_iva || 13}%):</span>
              <span>${tax_iva.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button className="glass-button" style={{ width: '100%', background: '#10b981', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleSaveQuote} disabled={saving || items.length === 0}>
              <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cotización'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cotizaciones;
