import React, { useState, useEffect } from 'react';
import { Plus, ShoppingBag, Truck, X, Check } from 'lucide-react';
import { supabase } from '../supabase';
import ProductSearch from '../components/ProductSearch';

const Compras = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [purchaseDetails, setPurchaseDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [documentType, setDocumentType] = useState('CCF');
  const [documentNumber, setDocumentNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CONTADO');
  
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [suppRes, prodRes, purRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('products').select('id, name, sku, cost, units_per_box, is_service').order('name'),
      supabase.from('purchases').select('*, suppliers(name)').order('created_at', { ascending: false }),
    ]);
    if (suppRes.data) setSuppliers(suppRes.data);
    if (prodRes.data) setProducts(prodRes.data);
    if (purRes.data) setPurchases(purRes.data);
    setLoading(false);
  };

  const handleSelectProduct = (prod) => {
    const existing = items.find(i => i.product_id === prod.id && i.sale_type === 'UNIDAD');
    if (existing) {
      setItems(items.map(i =>
        i.product_id === prod.id && i.sale_type === 'UNIDAD'
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_cost }
          : i
      ));
    } else {
      setItems([...items, {
        product_id: prod.id,
        name: prod.name,
        sku: prod.sku,
        units_per_box: prod.units_per_box || 1,
        is_service: prod.is_service || false,
        sale_type: 'UNIDAD',
        quantity: 1,
        unit_cost: Number(prod.cost) || 0,
        subtotal: Number(prod.cost) || 0,
        batch_number: '',
        expiration_date: ''
      }]);
    }
  };

  const changeItem = (index, field, value) => {
    const newItems = [...items];
    const item = newItems[index];
    item[field] = value;
    
    if (field === 'quantity' || field === 'unit_cost' || field === 'sale_type') {
      const multiplier = item.sale_type === 'CAJA' ? (item.units_per_box || 1) : 1;
      item.subtotal = Number(item.quantity) * Number(item.unit_cost) * multiplier;
    }
    
    setItems(newItems);
  };

  const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const hasIvaExtra = documentType === 'CCF';
  const taxAmount = hasIvaExtra ? (subtotal * 0.13) : 0;
  const total = subtotal + taxAmount;

  const handleSave = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id, branch_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No se encontró el perfil de empresa.');

      const { tenant_id, branch_id } = profile;

      // 1. Registrar la compra
      const { data: purchase, error: purError } = await supabase
        .from('purchases')
        .insert([{
          tenant_id,
          branch_id,
          supplier_id: selectedSupplierId || null,
          document_type: documentType,
          document_number: documentNumber,
          total,
          status: 'COMPLETADA',
          payment_method: paymentMethod,
          balance: paymentMethod === 'CREDITO' ? total : 0,
        }])
        .select()
        .single();

      if (purError) throw purError;

      // 1.5 Registrar los items de la compra
      const purchaseItemsData = items.map(item => {
        const totalUnits = item.sale_type === 'CAJA' ? item.quantity * item.units_per_box : item.quantity;
        return {
          tenant_id,
          purchase_id: purchase.id,
          product_id: item.product_id,
          quantity: totalUnits, // Guardamos la cantidad real de unidades ingresadas al inventario
          unit_cost: item.unit_cost, // Es el costo de 1 unidad
          subtotal: item.subtotal,
          batch_number: item.batch_number || null,
          expiration_date: item.expiration_date || null
        };
      });
      
      const { error: itemsError } = await supabase
        .from('purchase_items')
        .insert(purchaseItemsData);
        
      if (itemsError) throw itemsError;

      // 2. Por cada item, hacer upsert en inventory (sumar stock) (Omitir servicios)
      for (const item of items) {
        if (item.is_service) continue; // No registrar inventario si es servicio

        // Verificar si ya existe entrada en inventory para este producto/sucursal
        const { data: existing } = await supabase
          .from('inventory')
          .select('id, stock')
          .eq('product_id', item.product_id)
          .eq('branch_id', branch_id)
          .single();

        const addition = item.sale_type === 'CAJA' ? item.quantity * item.units_per_box : item.quantity;
        const actualCostPerUnit = Number(item.unit_cost);

        if (existing) {
          // Sumar al stock existente
          const newStock = existing.stock + addition;
          await supabase
            .from('inventory')
            .update({ stock: newStock, last_updated: new Date().toISOString() })
            .eq('id', existing.id);

          // Kardex
          await supabase.from('inventory_movements').insert([{
            tenant_id, branch_id, product_id: item.product_id,
            movement_type: 'IN', quantity: addition,
            previous_stock: existing.stock, new_stock: newStock,
            reference_id: purchase.id, description: `Compra - ${item.quantity} ${item.sale_type}`,
            created_by: userData.user.id
          }]);
        } else {
          // Crear nueva entrada
          await supabase
            .from('inventory')
            .insert([{
              tenant_id,
              branch_id,
              product_id: item.product_id,
              stock: addition,
            }]);

          // Kardex
          await supabase.from('inventory_movements').insert([{
            tenant_id, branch_id, product_id: item.product_id,
            movement_type: 'IN', quantity: addition,
            previous_stock: 0, new_stock: addition,
            reference_id: purchase.id, description: `Compra (Inicial) - ${item.quantity} ${item.sale_type}`,
            created_by: userData.user.id
          }]);
        }

        // 2.2 Insertar en product_batches (Lotes)
        if (!item.is_service && (item.batch_number || item.expiration_date)) {
          await supabase.from('product_batches').insert([{
            tenant_id,
            branch_id,
            product_id: item.product_id,
            purchase_id: purchase.id,
            batch_number: item.batch_number || null,
            expiration_date: item.expiration_date || null,
            current_stock: addition
          }]);
        }

        // 2.5 Actualizar el costo en el catálogo y recalcular precio según margen
        const { error: rpcError } = await supabase.rpc('update_cost_and_price', {
          p_product_id: item.product_id,
          p_new_cost: actualCostPerUnit
        });
        
        if (rpcError) {
          console.error("Error actualizando costo/precio:", rpcError);
        }
      }

      // 2.6 Generar Partida Contable Automática
      const { error: accError } = await supabase.rpc('create_purchase_journal_entry', {
        p_purchase_id: purchase.id
      });
      if (accError) console.error("Error generando partida contable:", accError);

      // 3. Resetear formulario
      setItems([]);
      setSelectedSupplierId('');
      setDocumentNumber('');
      setDocumentType('CCF');
      setShowModal(false);
      fetchData();
      alert(`✅ Compra registrada exitosamente.\nSe actualizó el inventario de ${items.length} artículo(s).`);

    } catch (err) {
      console.error('Error en compra:', err);
      alert('Error al registrar la compra: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetail = async (purchase) => {
    setSelectedPurchase(purchase);
    setDetailModalOpen(true);
    setLoadingDetails(true);
    setPurchaseDetails([]);

    const { data, error } = await supabase
      .from('purchase_items')
      .select('*, products(name, sku)')
      .eq('purchase_id', purchase.id);

    if (!error && data) {
      setPurchaseDetails(data);
    }
    setLoadingDetails(false);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Compras</h1>
        <button className="glass-button" onClick={() => setShowModal(true)}>
          <Plus size={18} /> Nueva Compra
        </button>
      </div>

      {/* Historial de Compras */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', fontSize: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>
          Historial de Compras
        </h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : purchases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <ShoppingBag size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No hay compras registradas todavía.</p>
          </div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Proveedor</th>
                <th>Tipo Doc.</th>
                <th>N° Documento</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map(p => (
                <tr key={p.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {new Date(p.created_at).toLocaleDateString('es-SV')}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Truck size={14} color="var(--text-muted)" />
                      {p.suppliers?.name || 'Sin proveedor'}
                    </div>
                  </td>
                  <td>{p.document_type || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>{p.document_number || '—'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${Number(p.total).toFixed(2)}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      color: '#4ade80', background: 'rgba(74,222,128,0.1)',
                      border: '1px solid rgba(74,222,128,0.3)',
                      padding: '3px 8px', borderRadius: '5px', fontSize: '12px', fontWeight: 600
                    }}>
                      <Check size={11} /> {p.status}
                    </span>
                  </td>
                  <td>
                    <button 
                      onClick={() => handleViewDetail(p)} 
                      className="glass-button" 
                      style={{ padding: '6px 12px', fontSize: '12px', minHeight: 'auto', background: 'rgba(255,255,255,0.05)' }}
                    >
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Nueva Compra */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div
            className="modal-content glass-panel"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '700px', width: '95%' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Nueva Compra</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Info de la compra */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Proveedor</label>
                <select className="glass-input" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)}>
                  <option value="">— Sin proveedor —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Tipo de Documento</label>
                <select className="glass-input" value={documentType} onChange={e => setDocumentType(e.target.value)}>
                  <option value="CCF">CCF</option>
                  <option value="Factura">Factura</option>
                  <option value="Nota de Remisión">Nota de Remisión</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>N° de Documento</label>
                <input type="text" className="glass-input" placeholder="001-0001-0000000" value={documentNumber}
                  onChange={e => setDocumentNumber(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Método de Pago</label>
                <select className="glass-input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="CONTADO">Contado</option>
                  <option value="CREDITO">Crédito</option>
                </select>
              </div>
            </div>

            {/* Agregar artículo */}
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)',
              borderRadius: '10px', padding: '16px', marginBottom: '20px'
            }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>
                Buscar Artículo
              </h4>
              <div style={{ zIndex: 10 }}>
                <ProductSearch products={products} onSelect={handleSelectProduct} />
              </div>
            </div>

            {/* Lista de artículos */}
            {items.length > 0 && (
              <table className="glass-table" style={{ marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Artículo</th>
                    <th>Tipo</th>
                    <th>Cant.</th>
                    <th>Costo Unit.</th>
                    <th>Lote</th>
                    <th>Vencimiento</th>
                    <th>Subtotal</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td style={{ fontWeight: 500 }}>{item.name} <br/><span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sku}</span></td>
                      <td>
                        <select 
                          className="glass-input" 
                          style={{ padding: '4px', fontSize: '12px', minWidth: '90px' }}
                          value={item.sale_type}
                          onChange={(e) => changeItem(index, 'sale_type', e.target.value)}
                        >
                          <option value="UNIDAD">Unidad</option>
                          {item.units_per_box > 1 && (
                            <option value="CAJA">Caja (x{item.units_per_box})</option>
                          )}
                        </select>
                      </td>
                      <td>
                        <input type="number" min="1" className="glass-input" style={{ width: '60px', padding: '4px', textAlign: 'center' }} 
                          value={item.quantity} onChange={(e) => changeItem(index, 'quantity', e.target.value)} />
                      </td>
                      <td>
                        <input type="number" min="0" step="0.01" className="glass-input" style={{ width: '80px', padding: '4px' }} 
                          value={item.unit_cost} onChange={(e) => changeItem(index, 'unit_cost', e.target.value)} />
                      </td>
                      <td>
                        <input type="text" className="glass-input" style={{ width: '80px', padding: '4px', fontSize: '11px' }} 
                          placeholder="Lote (opc)" value={item.batch_number} onChange={(e) => changeItem(index, 'batch_number', e.target.value)} />
                      </td>
                      <td>
                        <input type="date" className="glass-input" style={{ width: '100px', padding: '4px', fontSize: '11px' }} 
                          value={item.expiration_date} onChange={(e) => changeItem(index, 'expiration_date', e.target.value)} />
                      </td>
                      <td style={{ fontWeight: 600 }}>${item.subtotal.toFixed(2)}</td>
                      <td>
                        <button onClick={() => removeItem(index)}
                          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '1px solid var(--border-color)' }}>
                    <td colSpan="6" style={{ textAlign: 'right', fontWeight: 600, paddingTop: '12px' }}>Subtotal:</td>
                    <td style={{ fontWeight: 600, fontSize: '14px', paddingTop: '12px' }}>${subtotal.toFixed(2)}</td>
                    <td></td>
                  </tr>
                  {hasIvaExtra && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'right', fontWeight: 600 }}>IVA (13%):</td>
                      <td style={{ fontWeight: 600, fontSize: '14px' }}>${taxAmount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'right', fontWeight: 700 }}>TOTAL A PAGAR:</td>
                    <td style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>
                      ${total.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="glass-button" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="glass-button" onClick={handleSave} disabled={items.length === 0 || saving}>
                <Check size={16} /> {saving ? 'Guardando...' : `Registrar Compra ($${total.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalle */}
      {detailModalOpen && selectedPurchase && (
        <div className="modal-backdrop" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Detalle de Compra</h2>
              <button onClick={() => setDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Proveedor:</span> {selectedPurchase.suppliers?.name || 'N/A'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fecha:</span> {new Date(selectedPurchase.created_at).toLocaleString('es-SV')}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Documento:</span> {selectedPurchase.document_type} {selectedPurchase.document_number}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Total:</span> <strong style={{ color: 'var(--primary)' }}>${Number(selectedPurchase.total).toFixed(2)}</strong></div>
              </div>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando detalle...</div>
            ) : purchaseDetails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No hay detalles guardados para esta compra antigua.</div>
            ) : (
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Costo</th>
                    <th>Lote</th>
                    <th>Vencimiento</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseDetails.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.products?.sku}</td>
                      <td>{item.products?.name}</td>
                      <td>{item.quantity}</td>
                      <td>${Number(item.unit_cost).toFixed(2)}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.batch_number || '—'}</td>
                      <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : '—'}</td>
                      <td style={{ fontWeight: 600 }}>${Number(item.subtotal).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Compras;
