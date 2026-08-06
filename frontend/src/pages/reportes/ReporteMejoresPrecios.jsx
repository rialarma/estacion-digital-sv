import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { Tag, Search, ArrowDownCircle } from 'lucide-react';

const ReporteMejoresPrecios = ({ tenantId }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (tenantId) fetchBestPrices();
  }, [tenantId]);

  const fetchBestPrices = async () => {
    setLoading(true);
    try {
      const { data: items, error } = await supabase
        .from('purchase_items')
        .select(`
          unit_cost,
          product_id,
          products (name, sku),
          purchases!inner (
            status,
            created_at,
            suppliers (name)
          )
        `)
        .eq('purchases.status', 'COMPLETADA')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Agrupar por producto
      const productsMap = {};

      items.forEach(item => {
        const prod = item.products;
        if (!prod) return;
        
        const productId = item.product_id;
        const supplierName = item.purchases?.suppliers?.name || 'Sin Proveedor';
        const cost = Number(item.unit_cost);
        // Usar created_at de la compra
        const date = new Date(item.purchases?.created_at).getTime();

        if (!productsMap[productId]) {
          productsMap[productId] = {
            id: productId,
            name: prod.name,
            sku: prod.sku,
            suppliers: {}
          };
        }

        const suppData = productsMap[productId].suppliers[supplierName];
        // Solo guardamos si es la primera vez que vemos este proveedor para este producto
        // O si la fecha de esta compra es MÁS RECIENTE que la que ya teníamos guardada
        if (!suppData || date > suppData.date) {
          productsMap[productId].suppliers[supplierName] = { cost, date };
        }
      });

      // Transformar en array para la tabla
      const reportArray = Object.values(productsMap).map(p => {
        const suppEntries = Object.entries(p.suppliers);
        
        // Encontrar el más barato de los precios ACTUALIZADOS
        let bestSupplier = null;
        let bestPrice = Infinity;
        const others = [];

        let bestDate = null;

        suppEntries.forEach(([name, data]) => {
          if (data.cost < bestPrice) {
            bestPrice = data.cost;
            bestSupplier = name;
            bestDate = data.date;
          }
        });

        // Separar el mejor de los otros
        suppEntries.forEach(([name, data]) => {
          if (name !== bestSupplier || (name === bestSupplier && others.length > 0 && data.cost === bestPrice)) {
             // si hay empate, el primero se queda de bestSupplier, el resto en others
             if (name !== bestSupplier) {
               others.push({ name, cost: data.cost, date: data.date });
             }
          }
        });

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          bestSupplier,
          bestPrice: bestPrice === Infinity ? 0 : bestPrice,
          bestDate,
          others: others.sort((a,b) => a.cost - b.cost)
        };
      });

      // Ordenar por nombre de producto
      reportArray.sort((a, b) => a.name.localeCompare(b.name));
      
      setData(reportArray);
    } catch (err) {
      console.error("Error fetching best prices:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))
  );

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Analizando el historial de compras para encontrar los mejores precios...</div>;

  return (
    <div className="print-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag style={{ color: '#10b981' }} /> Mejores Precios de Proveedores
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Historial del costo más bajo registrado por proveedor para cada producto.
          </p>
        </div>
        
        <div className="search-bar no-print" style={{ width: '300px' }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar producto o SKU..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {filteredData.length > 0 ? (
          <table className="glass-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th style={{ color: '#10b981' }}>El Más Barato</th>
                <th style={{ color: '#10b981', textAlign: 'right' }}>Mejor Costo</th>
                <th>Otros Proveedores (Costo)</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => (
                <tr key={item.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{item.sku || '-'}</td>
                  <td style={{ fontWeight: 500 }}>{item.name}</td>
                  <td>
                    {item.bestSupplier ? (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px' }}>
                        <ArrowDownCircle size={14} style={{ marginRight: '4px' }}/> 
                        {item.bestSupplier}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Sin compras registradas</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#10b981', fontSize: '15px' }}>
                    {item.bestSupplier ? (
                      <div>
                        {formatCurrency(item.bestPrice)}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '2px' }}>
                          {item.bestDate ? new Date(item.bestDate).toLocaleDateString() : ''}
                        </div>
                      </div>
                    ) : '-'}
                  </td>
                  <td>
                    {item.others.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {item.others.map((o, i) => (
                          <div key={i} style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', borderBottom: i !== item.others.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', paddingBottom: i !== item.others.length - 1 ? '4px' : '0' }}>
                            <span>{o.name}</span>
                            <span>{formatCurrency(o.cost)} <span style={{ fontSize: '10px', opacity: 0.7 }}>({new Date(o.date).toLocaleDateString()})</span></span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.5 }}>Sin otras referencias</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
            No se encontraron productos con historial de compras.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReporteMejoresPrecios;
