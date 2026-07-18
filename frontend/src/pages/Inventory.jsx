import React, { useState, useEffect } from 'react';
import { Search, Package, Layers } from 'lucide-react';
import { supabase } from '../supabase';

import { useTenantStore } from '../store/useTenantStore';
import PageHeader from '../components/PageHeader';

const Inventory = () => {
  const { tenantId } = useTenantStore();
  const [inventory, setInventory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    if (!tenantId) return;
    
    // Obtener la sucursal del usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setLoading(true);
    const { data: profile } = await supabase.from('user_profiles').select('branch_id').eq('id', user.id).single();
    
    let query = supabase
      .from('inventory')
      .select(`
        id,
        stock,
        last_updated,
        branch_id,
        branches ( name ),
        products ( id, name, sku, price )
      `)
      .eq('tenant_id', tenantId);

    // Si el usuario pertenece a una sucursal, filtramos por su sucursal.
    if (profile && profile.branch_id) {
       query = query.eq('branch_id', profile.branch_id);
    }
      
    const { data, error } = await query.order('last_updated', { ascending: false });
      
    if (!error && data) {
      setInventory(data);
    } else if (error) {
      console.error("Error fetching inventory:", error);
    }

    // Fetch batches
    let bQuery = supabase
      .from('product_batches')
      .select('*, products(name)')
      .eq('tenant_id', tenantId)
      .gt('current_stock', 0)
      .not('expiration_date', 'is', null)
      .order('expiration_date', { ascending: true });

    if (profile && profile.branch_id) {
      bQuery = bQuery.eq('branch_id', profile.branch_id);
    }

    const { data: bData } = await bQuery;
    if (bData) {
      setBatches(bData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, [tenantId]);

  // Filter products locally for search
  const filteredInventory = inventory.filter(item => {
    const prod = item.products;
    if (!prod) return false;
    return prod.name?.toLowerCase().includes(search.toLowerCase()) || 
           prod.sku?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="page-container">
      <PageHeader title="Inventario de Sucursal" icon={Layers}>
        
      </PageHeader>

      {(() => {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const expiringBatches = batches.filter(b => {
          if (!b.expiration_date) return false;
          const expDate = new Date(b.expiration_date);
          return expDate <= thirtyDaysFromNow;
        });

        if (expiringBatches.length > 0) {
          return (
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px' 
            }}>
              <h3 style={{ color: '#ef4444', marginBottom: '12px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⚠️ Alertas de Vencimiento ({expiringBatches.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {expiringBatches.map(b => {
                  const isExpired = new Date(b.expiration_date) < today;
                  return (
                    <div key={b.id} style={{ 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      padding: '12px', 
                      borderRadius: '6px',
                      borderLeft: `4px solid ${isExpired ? '#ef4444' : '#fbbf24'}`
                    }}>
                      <div style={{ fontWeight: 600 }}>{b.products?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Lote: {b.batch_number || 'S/N'} | Queda: {b.current_stock}
                      </div>
                      <div style={{ fontSize: '12px', color: isExpired ? '#ef4444' : '#fbbf24', marginTop: '4px', fontWeight: 600 }}>
                        {isExpired ? 'Vencido el: ' : 'Vence el: '}
                        {new Date(b.expiration_date).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', maxWidth: '400px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Buscar por nombre o SKU..." 
              style={{ paddingLeft: '40px' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando inventario...</div>
        ) : filteredInventory.length === 0 ? (
           <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
             <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
             <p>No hay productos en el inventario.</p>
             <p style={{ fontSize: '14px', marginTop: '8px' }}>El inventario se reflejará automáticamente al registrar productos en el catálogo.</p>
           </div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre del Artículo</th>
                <th>Precio Venta</th>
                <th>Stock Disponible</th>
                <th>Última Actualización</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map(item => {
                const prod = item.products || {};
                return (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-muted)' }}>{prod.sku}</td>
                    <td style={{ fontWeight: 500 }}>{prod.name}</td>
                    <td>${Number(prod.price || 0).toFixed(2)}</td>
                    <td>
                      <span style={{ 
                        color: item.stock > 20 ? '#4ade80' : (item.stock > 0 ? '#fbbf24' : '#f87171'),
                        background: item.stock > 20 ? 'rgba(74, 222, 128, 0.1)' : (item.stock > 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(248, 113, 113, 0.1)'),
                        border: `1px solid ${item.stock > 20 ? 'rgba(74, 222, 128, 0.3)' : (item.stock > 0 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(248, 113, 113, 0.3)')}`,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 600
                      }}>
                        {item.stock} unidades
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {item.last_updated ? new Date(item.last_updated).toLocaleString('es-SV') : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Inventory;

