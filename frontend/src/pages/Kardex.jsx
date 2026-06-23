import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { Package, Search, ArrowRight, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const Kardex = () => {
  const { tenantId } = useTenantStore();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [tenantId]);

  const fetchProducts = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('user_profiles').select('branch_id').eq('id', user.id).single();

    let query = supabase
      .from('inventory')
      .select('id, stock, products(id, name, sku)')
      .eq('tenant_id', tenantId);

    if (profile?.branch_id) {
      query = query.eq('branch_id', profile.branch_id);
    }

    const { data } = await query;
    if (data) setProducts(data);
    setLoading(false);
  };

  const loadKardex = async (inventoryRecord) => {
    setSelectedProduct(inventoryRecord);
    const productId = inventoryRecord.products.id;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('user_profiles').select('branch_id').eq('id', user.id).single();

    let query = supabase
      .from('inventory_movements')
      .select('*, user_profiles(first_name, last_name)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (profile?.branch_id) {
      query = query.eq('branch_id', profile.branch_id);
    }

    const { data } = await query;
    if (data) setMovements(data);
  };

  const filteredProducts = products.filter(p => 
    p.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.products?.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={24} /> Historial de Movimientos (Kardex)
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Lista de Productos */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="glass-input"
              placeholder="Buscar producto..."
              style={{ paddingLeft: '40px' }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando inventario...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '600px', overflowY: 'auto' }}>
              {filteredProducts.map(p => (
                <div 
                  key={p.id}
                  onClick={() => loadKardex(p)}
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    background: selectedProduct?.id === p.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedProduct?.id === p.id ? '#3b82f6' : 'transparent'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{p.products?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {p.products?.sku}</div>
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                    {p.stock}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detalle Kardex */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {!selectedProduct ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p>Selecciona un producto de la izquierda para ver su historial.</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Historial: {selectedProduct.products?.name}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>Stock Actual: <strong style={{ color: 'var(--text-main)' }}>{selectedProduct.stock} unidades</strong></p>

              {movements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay movimientos registrados.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Descripción</th>
                        <th>Cant.</th>
                        <th>Stock Resultante</th>
                        <th>Usuario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map(m => (
                        <tr key={m.id}>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(m.created_at).toLocaleString()}
                          </td>
                          <td>
                            {m.movement_type === 'IN' ? (
                              <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={14}/> ENTRADA</span>
                            ) : m.movement_type === 'OUT' ? (
                              <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingDown size={14}/> SALIDA</span>
                            ) : (
                              <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowRight size={14}/> TRASLADO</span>
                            )}
                          </td>
                          <td>{m.description || '-'}</td>
                          <td style={{ fontWeight: 'bold' }}>
                            {m.movement_type === 'OUT' ? '-' : '+'}{m.quantity}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#60a5fa' }}>{m.new_stock}</td>
                          <td style={{ fontSize: '12px' }}>{m.user_profiles?.first_name || 'Sistema'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Kardex;
