import React, { useState, useEffect } from 'react';
import { Search, Package } from 'lucide-react';
import { supabase } from '../supabase';

import { useTenantStore } from '../store/useTenantStore';

const Inventory = () => {
  const { tenantId } = useTenantStore();
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    if (!tenantId) return;
    setLoading(true);
    
    // Obtener la sucursal del usuario
    const { data: { user } } = await supabase.auth.getUser();
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
      <div className="page-header">
        <h1 className="page-title">Inventario de Sucursal</h1>
      </div>

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

