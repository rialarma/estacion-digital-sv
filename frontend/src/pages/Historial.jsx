import React, { useState, useEffect } from 'react';
import { ShoppingCart, ShoppingBag, X, Search, Printer, FileText, ArrowRightLeft, Undo2, History } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { printDocument } from '../utils/printUtils';
import PageHeader from '../components/PageHeader';

const Historial = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { tenantInfo } = useTenantStore();
  
  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [txDetails, setTxDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Return Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnTx, setReturnTx] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [processingReturn, setProcessingReturn] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    
    // 1. Fetch Sales
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*, clients(name), seller:user_profiles!sales_seller_id_fkey(first_name, last_name)');
      
    // 2. Fetch Purchases
    const { data: purchasesData, error: purchasesError } = await supabase
      .from('purchases')
      .select('*, suppliers(name)');

    let combined = [];

    if (!salesError && salesData) {
      combined = combined.concat(salesData.map(s => ({
        ...s,
        tipo_transaccion: 'VENTA',
        entidad_nombre: s.clients?.name || 'Consumidor Final',
        documento_ref: 'DTE ' + (s.status === 'COMPLETADA' ? '' : s.status), // Simplified, ideally we'd fetch DTE but we don't have it joined here
      })));
    }

    if (!purchasesError && purchasesData) {
      combined = combined.concat(purchasesData.map(p => ({
        ...p,
        tipo_transaccion: 'COMPRA',
        entidad_nombre: p.suppliers?.name || 'Sin Proveedor',
        documento_ref: `${p.document_type || 'DOC'} - ${p.document_number || 'N/A'}`,
      })));
    }

    // Sort by created_at desc
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setTransactions(combined);
    setLoading(false);
  };

  const handleViewDetail = async (tx) => {
    setSelectedTx(tx);
    setDetailModalOpen(true);
    setLoadingDetails(true);
    setTxDetails([]);

    if (tx.tipo_transaccion === 'VENTA') {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, products(name, sku)')
        .eq('sale_id', tx.id);
      if (!error && data) setTxDetails(data);
    } else {
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*, products(name, sku)')
        .eq('purchase_id', tx.id);
      if (!error && data) setTxDetails(data.map(item => ({...item, unit_price: item.cost}))); // Normalize field names for UI
    }

    setLoadingDetails(false);
  };

  const handleOpenReturn = async (tx) => {
    setReturnTx(tx);
    setReturnReason('');
    setReturnModalOpen(true);
    setLoadingDetails(true);
    
    const { data, error } = await supabase
      .from('sale_items')
      .select('*, products(name, sku)')
      .eq('sale_id', tx.id);
      
    if (!error && data) {
      setReturnItems(data.map(item => ({ ...item, quantity_to_return: 0 })));
    }
    setLoadingDetails(false);
  };

  const handleProcessReturn = async () => {
    const itemsToReturn = returnItems.filter(item => item.quantity_to_return > 0);
    if (itemsToReturn.length === 0) {
      alert("Debe seleccionar al menos un producto para devolver.");
      return;
    }
    
    setProcessingReturn(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payloadItems = itemsToReturn.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity_to_return,
        unit_price: item.unit_price,
        subtotal: item.quantity_to_return * item.unit_price,
        is_service: false // Por simplicidad asumimos false.
      }));
      
      const { error } = await supabase.rpc('process_return', {
        p_tenant_id: returnTx.tenant_id,
        p_branch_id: returnTx.branch_id,
        p_sale_id: returnTx.id,
        p_cashier_id: user.id,
        p_shift_id: returnTx.shift_id,
        p_reason: returnReason,
        p_items: payloadItems
      });
      
      if (error) throw error;
      
      alert("Devolución procesada con éxito.");
      setReturnModalOpen(false);
      fetchTransactions();
    } catch (err) {
      console.error(err);
      alert("Error procesando devolución: " + err.message);
    }
    setProcessingReturn(false);
  };

  const handlePrint = async (sale, format) => {
    if (sale.tipo_transaccion !== 'VENTA') {
      alert("Solo se pueden imprimir comprobantes de Venta en este momento.");
      return;
    }
    const { data: items } = await supabase
      .from('sale_items')
      .select('*, products(name, sku)')
      .eq('sale_id', sale.id);
      
    if (items) {
      printDocument(sale, items, tenantInfo, format);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = tx.entidad_nombre.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || tx.tipo_transaccion === filterType;
    
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(tx.created_at) >= new Date(dateFrom + 'T00:00:00');
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(tx.created_at) <= new Date(dateTo + 'T23:59:59');
    }

    return matchesSearch && matchesType && matchesDate;
  });

  return (
    <div className="page-container">
      <PageHeader title="Historial de Transacciones" icon={History}>
        
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Buscar por Entidad</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Cliente o Proveedor..." 
                style={{ paddingLeft: '36px' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tipo</label>
            <select className="glass-input" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="ALL">Todas</option>
              <option value="VENTA">Ventas</option>
              <option value="COMPRA">Compras</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Desde</label>
            <input type="date" className="glass-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Hasta</label>
            <input type="date" className="glass-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando historial...</div>
        ) : filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <ArrowRightLeft size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No hay transacciones registradas.</p>
          </div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Entidad</th>
                <th>Documento</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={`${tx.tipo_transaccion}-${tx.id}`}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {new Date(tx.created_at).toLocaleString('es-SV')}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: tx.tipo_transaccion === 'VENTA' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                      color: tx.tipo_transaccion === 'VENTA' ? '#4ade80' : '#a855f7',
                      border: `1px solid ${tx.tipo_transaccion === 'VENTA' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(167, 139, 250, 0.2)'}`
                    }}>
                      {tx.tipo_transaccion}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{tx.entidad_nombre}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.documento_ref}</td>
                  <td>${Number(tx.subtotal || 0).toFixed(2)}</td>
                  <td>${Number(tx.tax_iva || 0).toFixed(2)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${Number(tx.total).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="glass-button" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleViewDetail(tx)}>
                        Ver Detalle
                      </button>
                      {tx.tipo_transaccion === 'VENTA' && (
                        <>
                          <button className="glass-button" style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} onClick={() => handlePrint(tx, 'TICKET')} title="Imprimir Ticket">
                            <Printer size={14} />
                          </button>
                          <button className="glass-button" style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: '#ef4444' }} onClick={() => handlePrint(tx, 'PDF')} title="Imprimir PDF (Carta)">
                            <FileText size={14} />
                          </button>
                          {tx.status !== 'DEVUELTA' && (
                            <button className="glass-button" style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--border-color)', color: '#f59e0b' }} onClick={() => handleOpenReturn(tx)} title="Devolver / Nota de Crédito">
                              <Undo2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Ver Detalle */}
      {detailModalOpen && selectedTx && (
        <div className="modal-backdrop" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Detalle de {selectedTx.tipo_transaccion === 'VENTA' ? 'Venta' : 'Compra'}</h2>
              <button onClick={() => setDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>{selectedTx.tipo_transaccion === 'VENTA' ? 'Cliente:' : 'Proveedor:'}</span> {selectedTx.entidad_nombre}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Vendedor:</span> {selectedTx.seller ? `${selectedTx.seller.first_name} ${selectedTx.seller.last_name}` : <span style={{ color: 'var(--text-muted)' }}>Sin Asignar</span>}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fecha:</span> {new Date(selectedTx.created_at).toLocaleString('es-SV')}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Documento:</span> {selectedTx.documento_ref}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Estado:</span> {selectedTx.status}</div>
                {selectedTx.payment_method && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Método de Pago:</span> {selectedTx.payment_method}</div>
                )}
              </div>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando detalle...</div>
            ) : txDetails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No hay detalles guardados.</div>
            ) : (
              <>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>{selectedTx.tipo_transaccion === 'VENTA' ? 'Precio Unit.' : 'Costo Unit.'}</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txDetails.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.products?.sku}</td>
                        <td>{item.products?.name}</td>
                        <td>{item.quantity}</td>
                        <td>${Number(item.unit_price || 0).toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>${Number(item.subtotal || (item.quantity * item.unit_price) || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Subtotal: ${Number(selectedTx.subtotal || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>IVA (13%): ${Number(selectedTx.tax_iva || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Total: ${Number(selectedTx.total || 0).toFixed(2)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Modal Devolución */}
      {returnModalOpen && returnTx && (
        <div className="modal-backdrop" onClick={() => !processingReturn && setReturnModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Devolución / Nota de Crédito</h2>
              <button onClick={() => !processingReturn && setReturnModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#f59e0b' }}>
                Estás procesando una devolución para la Venta <strong>{returnTx.documento_ref}</strong> de <strong>{returnTx.entidad_nombre}</strong>.
              </p>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando detalles de la venta...</div>
            ) : (
              <>
                <table className="glass-table" style={{ marginBottom: '20px' }}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant. Comprada</th>
                      <th>Precio Unit.</th>
                      <th>Cant. a Devolver</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item, index) => (
                      <tr key={item.id}>
                        <td>{item.products?.name}</td>
                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                        <td>${Number(item.unit_price || 0).toFixed(2)}</td>
                        <td style={{ width: '120px' }}>
                          <input 
                            type="number" 
                            className="glass-input" 
                            min="0" 
                            max={item.quantity} 
                            style={{ padding: '4px 8px', height: '30px', textAlign: 'center' }}
                            value={item.quantity_to_return === 0 ? '' : item.quantity_to_return}
                            onChange={(e) => {
                              let val = Number(e.target.value);
                              if (val > item.quantity) val = item.quantity;
                              if (val < 0) val = 0;
                              const newItems = [...returnItems];
                              newItems[index].quantity_to_return = val;
                              setReturnItems(newItems);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <div className="form-group">
                  <label>Motivo de la Devolución</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Ej. Producto dañado, cliente se arrepintió..."
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button type="button" className="glass-button" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setReturnModalOpen(false)} disabled={processingReturn}>
                    Cancelar
                  </button>
                  <button type="button" className="glass-button" style={{ background: '#f59e0b', color: '#000', fontWeight: 'bold' }} onClick={handleProcessReturn} disabled={processingReturn}>
                    {processingReturn ? 'Procesando...' : 'Confirmar Devolución'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Historial;
