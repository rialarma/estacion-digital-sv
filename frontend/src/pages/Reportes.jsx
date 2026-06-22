import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Package, Activity, Calendar } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

const Reportes = () => {
  const { tenantId } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7days'); // 'today', '7days', '30days', 'year'
  const [kpis, setKpis] = useState({ ingresos: 0, costo: 0, ganancia: 0, margen: 0, ticketPromedio: 0 });
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  useEffect(() => {
    if (tenantId) {
      fetchReportData();
    }
  }, [tenantId, period]);

  const fetchReportData = async () => {
    setLoading(true);

    try {
      // 1. Determinar el rango de fechas
      const now = new Date();
      let startDate = new Date();
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (period === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      
      const isoStart = startDate.toISOString();

      // 2. Traer las ventas del periodo
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('id, total, created_at, sale_items(quantity, unit_price, unit_cost, product_id, products(name))')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart)
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // 3. Calcular KPIs
      let totalIngresos = 0;
      let totalCosto = 0;
      const productsCount = {};
      const salesByDate = {}; // Para el gráfico

      salesData.forEach(sale => {
        totalIngresos += Number(sale.total);
        
        // Agrupar por fecha para el gráfico
        const dateObj = new Date(sale.created_at);
        const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
        if (!salesByDate[dateStr]) salesByDate[dateStr] = 0;
        salesByDate[dateStr] += Number(sale.total);

        // Procesar items para costo y top productos
        if (sale.sale_items) {
          sale.sale_items.forEach(item => {
            const itemQty = Number(item.quantity);
            const itemCost = Number(item.unit_cost || 0);
            totalCosto += (itemQty * itemCost);

            const pId = item.product_id;
            const pName = item.products?.name || 'Desconocido';
            if (!productsCount[pId]) {
              productsCount[pId] = { name: pName, quantity: 0, revenue: 0 };
            }
            productsCount[pId].quantity += itemQty;
            productsCount[pId].revenue += (itemQty * Number(item.unit_price));
          });
        }
      });

      const ganancia = totalIngresos - totalCosto;
      const margen = totalIngresos > 0 ? (ganancia / totalIngresos) * 100 : 0;
      const ticketPromedio = salesData.length > 0 ? totalIngresos / salesData.length : 0;

      setKpis({
        ingresos: totalIngresos,
        costo: totalCosto,
        ganancia: ganancia,
        margen: margen,
        ticketPromedio: ticketPromedio
      });

      // Preparar datos del gráfico
      const formattedChartData = Object.keys(salesByDate).map(date => ({
        fecha: date,
        ventas: salesByDate[date]
      }));
      setChartData(formattedChartData);

      // Preparar Top Productos (ordenar por cantidad)
      const topArr = Object.values(productsCount).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      setTopProducts(topArr);

    } catch (err) {
      console.error('Error fetching reports:', err);
      alert('Error cargando reportes.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Reportes y Analíticas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Métricas clave de tu negocio.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--glass-bg)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Calendar size={16} style={{ color: 'var(--primary)' }} />
          <select 
            className="glass-input" 
            style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '14px', width: 'auto' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="today">Hoy</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="year">Último Año</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Calculando métricas...</div>
      ) : (
        <>
          {/* Tarjetas de KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <DollarSign size={16} /> Ingresos Brutos
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.ingresos)}</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <Activity size={16} /> Costo de Ventas
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f87171' }}>{formatCurrency(kpis.costo)}</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <TrendingUp size={16} /> Ganancia Bruta
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80' }}>{formatCurrency(kpis.ganancia)}</div>
              <div style={{ fontSize: '12px', color: kpis.margen > 0 ? '#4ade80' : 'var(--text-muted)' }}>
                {kpis.margen.toFixed(1)}% Margen
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <Package size={16} /> Ticket Promedio
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.ticketPromedio)}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Gráfico */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '24px' }}>Evolución de Ventas</h3>
              <div style={{ height: '300px' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                      <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip 
                        contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--primary)', fontWeight: 'bold' }}
                        formatter={(value) => [`$${value.toFixed(2)}`, 'Ventas']}
                      />
                      <Bar dataKey="ventas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    No hay suficientes datos para el gráfico en este periodo.
                  </div>
                )}
              </div>
            </div>

            {/* Top Productos */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '24px' }}>Top 5 Productos</h3>
              {topProducts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {topProducts.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '14px' }}>{p.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.quantity} unid. vendidas</div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {formatCurrency(p.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No hay ventas registradas.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reportes;
