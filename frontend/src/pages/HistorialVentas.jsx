import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, Check, Search } from 'lucide-react';
import { supabase } from '../supabase';

const HistorialVentas = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('*, clients(name), sellers(name)')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setSales(data);
    }
    setLoading(false);
  };

  const handleViewDetail = async (sale) => {
    setSelectedSale(sale);
    setDetailModalOpen(true);
    setLoadingDetails(true);
    setSaleDetails([]);

    const { data, error } = await supabase
      .from('sale_items')
      .select('*, products(name, sku)')
      .eq('sale_id', sale.id);

    if (!error && data) {
      setSaleDetails(data);
    }
    setLoadingDetails(false);
  };

  const filteredSales = sales.filter(s => 
    s.clients?.name?.toLowerCase().includes(search.toLowerCase()) || 
    (s.clients === null && 'consumidor final'.includes(search.toLowerCase()))
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Historial de Ventas</h1>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Buscar por cliente..." 
              style={{ paddingLeft: '40px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando ventas...</div>
        ) : filteredSales.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <ShoppingCart size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No hay ventas registradas.</p>
          </div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Subtotal</th>
                <th>IVA</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map(s => (
                <tr key={s.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {new Date(s.created_at).toLocaleString('es-SV')}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {s.clients?.name || <span style={{ color: 'var(--text-muted)' }}>Consumidor Final</span>}
                  </td>
                  <td>{s.sellers?.name || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                  <td>${Number(s.subtotal).toFixed(2)}</td>
                  <td>${Number(s.tax_iva).toFixed(2)}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${Number(s.total).toFixed(2)}</td>
                  <td>
                    <button 
                      onClick={() => handleViewDetail(s)} 
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

      {/* Modal Ver Detalle */}
      {detailModalOpen && selectedSale && (
        <div className="modal-backdrop" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>Detalle de Venta</h2>
              <button onClick={() => setDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Cliente:</span> {selectedSale.clients?.name || 'Consumidor Final'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Vendedor:</span> {selectedSale.sellers?.name || '-'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Fecha:</span> {new Date(selectedSale.created_at).toLocaleString('es-SV')}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Estado:</span> {selectedSale.status}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Método de Pago:</span> {selectedSale.payment_method}</div>
              </div>
            </div>

            {loadingDetails ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Cargando detalle...</div>
            ) : saleDetails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No hay detalles guardados para esta venta antigua.</div>
            ) : (
              <>
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Precio Unit.</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleDetails.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.products?.sku}</td>
                        <td>{item.products?.name}</td>
                        <td>{item.quantity}</td>
                        <td>${Number(item.unit_price).toFixed(2)}</td>
                        <td style={{ fontWeight: 600 }}>${Number(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Subtotal: ${Number(selectedSale.subtotal).toFixed(2)}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>IVA (13%): ${Number(selectedSale.tax_iva).toFixed(2)}</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Total: ${Number(selectedSale.total).toFixed(2)}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialVentas;
