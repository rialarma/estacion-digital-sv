import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { Package, DollarSign, AlertTriangle, ShoppingCart } from 'lucide-react';

const DashboardInventario = ({ tenantId }) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ totalProductos: 0, valorTotal: 0, criticos: 0, comprasPendientes: 0 });
  const [criticalStock, setCriticalStock] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'];

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]); // Inventario usually doesn't depend on "period", it's a current snapshot

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener inventario actual y productos
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select(`
          stock, 
          product_id, 
          products ( name, cost, category, min_stock )
        `)
        .eq('tenant_id', tenantId);

      if (invError) throw invError;

      // 2. Obtener compras pendientes
      const { data: purchData } = await supabase
        .from('purchases')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('status', 'PENDING');

      let valorTotal = 0;
      let criticos = 0;
      const catCount = {};
      const critList = [];

      invData?.forEach(item => {
        const prod = item.products;
        if (!prod) return;

        const stock = Number(item.stock);
        const cost = Number(prod.cost || 0);
        const minStock = Number(prod.min_stock !== undefined ? prod.min_stock : 5);

        valorTotal += (stock * cost);

        if (stock <= minStock) {
          criticos += 1;
          critList.push({ name: prod.name, stock, minStock, status: stock === 0 ? 'Agotado' : 'Crítico' });
        }

        const catName = prod.category || 'Sin Categoría';
        if (!catCount[catName]) catCount[catName] = 0;
        catCount[catName] += stock;
      });

      setKpis({
        totalProductos: invData?.length || 0,
        valorTotal,
        criticos,
        comprasPendientes: purchData?.length || 0
      });

      setCriticalStock(critList.sort((a, b) => a.stock - b.stock).slice(0, 5));
      
      setCategoryData(Object.keys(catCount).map(k => ({
        name: k, stock: catCount[k]
      })).sort((a, b) => b.stock - a.stock).slice(0, 7)); // Top 7 categorías

    } catch (err) {
      console.error('Error fetching inventario:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando estado del inventario...</div>;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <Package size={16} /> TOTAL PRODUCTOS (SKUs)
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{kpis.totalProductos}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <DollarSign size={16} /> VALOR DEL INVENTARIO
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(kpis.valorTotal)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <AlertTriangle size={16} /> PRODUCTOS CRÍTICOS
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: kpis.criticos > 0 ? '#ef4444' : '#10b981' }}>{kpis.criticos}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <ShoppingCart size={16} /> COMPRAS PENDIENTES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{kpis.comprasPendientes}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
        
        {/* Distribución por Categoría */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px' }}>Stock por Categoría</h3>
          <div style={{ height: '300px' }}>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="stock" name="Unidades en Stock" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos.</div>
            )}
          </div>
        </div>

        {/* Top 5 Productos Menor Stock */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
            <h3>Productos Críticos (Bajo Stock)</h3>
          </div>
          
          {criticalStock.length > 0 ? (
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', textAlign: 'left' }}>
                    <th style={{ padding: '12px 8px' }}>Producto</th>
                    <th style={{ padding: '12px 8px' }}>Stock Actual</th>
                    <th style={{ padding: '12px 8px' }}>Mínimo</th>
                    <th style={{ padding: '12px 8px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalStock.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '14px' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 500 }}>{item.name}</td>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{item.stock}</td>
                      <td style={{ padding: '12px 8px', color: 'var(--text-muted)' }}>{item.minStock}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                          background: item.status === 'Agotado' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: item.status === 'Agotado' ? '#ef4444' : '#f59e0b'
                        }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#10b981', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Package size={24} />
              </div>
              <div>Inventario Saludable. No hay productos críticos.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardInventario;
