import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { ShoppingCart, Target, Users, CreditCard, Package } from 'lucide-react';

import { useTenantStore } from '../../store/useTenantStore';
const DashboardComercial = ({ tenantId, isoStart }) => {
  const { tenantInfo } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ ventas: 0, meta: 15000, ticketPromedio: 0, transacciones: 0 });
  const [topSellers, setTopSellers] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  useEffect(() => {
    if (tenantId && isoStart) {
      fetchData();
    }
  }, [tenantId, isoStart]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id, 
          total, 
          created_at, 
          payment_method,
          seller_id,
          user_profiles:user_profiles!sales_seller_id_fkey ( first_name, last_name ),
          sale_items ( quantity, unit_price, product_id, products ( name ) )
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart);

      if (salesError) throw salesError;

      let totalVentas = 0;
      const sellersCount = {};
      const productsCount = {};
      const paymentsCount = {};

      salesData?.forEach(sale => {
        const amt = Number(sale.total);
        totalVentas += amt;

        // Vendedores
        const sName = sale.user_profiles ? `${sale.user_profiles.first_name} ${sale.user_profiles.last_name}` : 'Vendedor General';
        if (!sellersCount[sName]) sellersCount[sName] = { name: sName, revenue: 0, trans: 0 };
        sellersCount[sName].revenue += amt;
        sellersCount[sName].trans += 1;

        // Métodos de Pago
        const method = sale.payment_method || 'EFECTIVO';
        if (!paymentsCount[method]) paymentsCount[method] = 0;
        paymentsCount[method] += amt;

        // Productos
        sale.sale_items?.forEach(item => {
          const qty = Number(item.quantity);
          const pName = item.products?.name || 'Desconocido';
          if (!productsCount[pName]) productsCount[pName] = { name: pName, quantity: 0, revenue: 0 };
          productsCount[pName].quantity += qty;
          productsCount[pName].revenue += (qty * Number(item.unit_price));
        });
      });

      setKpis({
        ventas: totalVentas,
        meta: Number(tenantInfo?.monthly_sales_goal || 15000), // Dynamic target
        ticketPromedio: salesData.length > 0 ? totalVentas / salesData.length : 0,
        transacciones: salesData.length
      });

      setTopSellers(Object.values(sellersCount).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
      setTopProducts(Object.values(productsCount).sort((a, b) => b.quantity - a.quantity).slice(0, 5));
      
      setPaymentMethods(Object.keys(paymentsCount).map(k => ({
        name: k, value: paymentsCount[k]
      })).sort((a, b) => b.value - a.value));

    } catch (err) {
      console.error('Error fetching comercial:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;
  const progressPercent = Math.min((kpis.ventas / kpis.meta) * 100, 100);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos comerciales...</div>;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <ShoppingCart size={16} /> VENTAS TOTALES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(kpis.ventas)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', background: 'rgba(255,255,255,0.1)', width: '100%' }}>
            <div style={{ height: '100%', background: '#3b82f6', width: `${progressPercent}%` }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <Target size={16} /> META DEL PERIODO
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.meta)}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{progressPercent.toFixed(1)}% Cumplimiento</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <CreditCard size={16} /> TICKET PROMEDIO
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.ticketPromedio)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <Users size={16} /> TRANSACCIONES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{kpis.transacciones}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Top Vendedores */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Users size={20} style={{ color: 'var(--primary)' }} />
            <h3>Rendimiento por Vendedor</h3>
          </div>
          {topSellers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topSellers.map((v, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{v.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.trans} transacciones</div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--primary)' }}>
                    {formatCurrency(v.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Sin datos.</div>
          )}
        </div>

        {/* Top Productos */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Package size={20} style={{ color: 'var(--primary)' }} />
            <h3>Top 5 Productos Vendidos</h3>
          </div>
          {topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topProducts.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.quantity} unid.</div>
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                    {formatCurrency(p.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Sin datos.</div>
          )}
        </div>

        {/* Métodos de Pago */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <CreditCard size={20} style={{ color: 'var(--primary)' }} />
            <h3>Ingresos por Método</h3>
          </div>
          <div style={{ height: '250px' }}>
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ fontWeight: 'bold', color: '#fff' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardComercial;
