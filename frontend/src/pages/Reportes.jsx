import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, DollarSign, Package, Activity, Calendar, Users, CreditCard } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

const Reportes = () => {
  const { tenantId } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30days'); // 'today', '7days', '30days', 'year'
  
  // States para data procesada
  const [kpis, setKpis] = useState({ ingresos: 0, costo: 0, ganancia: 0, margen: 0, ticketPromedio: 0 });
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Colores para el PieChart de métodos de pago
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  useEffect(() => {
    if (tenantId) {
      fetchReportData();
    }
  }, [tenantId, period]);

  const fetchReportData = async () => {
    setLoading(true);

    try {
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

      // Consultar ventas con toda su metadata (vendedor, método de pago, ítems)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select(`
          id, 
          total, 
          created_at, 
          payment_method,
          seller_id,
          user_profiles:user_profiles!sales_seller_id_fkey ( first_name, last_name ),
          sale_items ( quantity, unit_price, unit_cost, product_id, products ( name ) )
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart)
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Variables de acumulación
      let totalIngresos = 0;
      let totalCosto = 0;
      
      const productsCount = {};
      const sellersCount = {};
      const paymentsCount = {};
      const dailyData = {}; 

      salesData.forEach(sale => {
        const saleTotal = Number(sale.total);
        totalIngresos += saleTotal;
        
        // --- 1. Agrupación Diaria (Ingresos y Costos) ---
        const dateObj = new Date(sale.created_at);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { fecha: dateStr, ingresos: 0, costo: 0, ganancia: 0 };
        }
        dailyData[dateStr].ingresos += saleTotal;

        // --- 2. Vendedores ---
        const sName = sale.user_profiles ? `${sale.user_profiles.first_name} ${sale.user_profiles.last_name}` : 'Vendedor General';
        if (!sellersCount[sName]) {
          sellersCount[sName] = { name: sName, revenue: 0, transactions: 0 };
        }
        sellersCount[sName].revenue += saleTotal;
        sellersCount[sName].transactions += 1;

        // --- 3. Métodos de Pago ---
        const method = sale.payment_method || 'EFECTIVO';
        if (!paymentsCount[method]) {
          paymentsCount[method] = 0;
        }
        paymentsCount[method] += saleTotal;

        // --- 4. Costos y Productos ---
        let saleCost = 0;
        if (sale.sale_items) {
          sale.sale_items.forEach(item => {
            const itemQty = Number(item.quantity);
            const itemCost = Number(item.unit_cost || 0);
            const lineCost = itemQty * itemCost;
            
            totalCosto += lineCost;
            saleCost += lineCost;

            const pId = item.product_id;
            const pName = item.products?.name || 'Desconocido';
            if (!productsCount[pId]) {
              productsCount[pId] = { name: pName, quantity: 0, revenue: 0 };
            }
            productsCount[pId].quantity += itemQty;
            productsCount[pId].revenue += (itemQty * Number(item.unit_price));
          });
        }
        
        // Sumar costo y ganancia al día correspondiente
        dailyData[dateStr].costo += saleCost;
        dailyData[dateStr].ganancia += (saleTotal - saleCost);
      });

      // Calcular KPIs Globales
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

      // Formatear Evolución Diaria
      setChartData(Object.values(dailyData));

      // Formatear Top Vendedores
      const topSArr = Object.values(sellersCount).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      setTopSellers(topSArr);

      // Formatear Métodos de Pago (para PieChart)
      const payArr = Object.keys(paymentsCount).map(k => ({
        name: k, value: paymentsCount[k]
      })).sort((a, b) => b.value - a.value);
      setPaymentMethods(payArr);

      // Formatear Top Productos
      const topPArr = Object.values(productsCount).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
      setTopProducts(topPArr);

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
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Reportes y Analíticas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Métricas clave y rendimiento de tu negocio.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--glass-bg)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Calendar size={16} style={{ color: 'var(--primary)' }} />
          <select 
            className="glass-input" 
            style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '14px', width: 'auto', outline: 'none' }}
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
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Analizando datos de la base...</div>
      ) : (
        <>
          {/* Fila 1: Tarjetas de KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <DollarSign size={16} /> Ingresos Brutos
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.ingresos)}</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <Activity size={16} /> Costo Total
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f87171' }}>{formatCurrency(kpis.costo)}</div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <TrendingUp size={16} /> Ganancia Neta
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80' }}>{formatCurrency(kpis.ganancia)}</div>
              <div style={{ fontSize: '12px', color: kpis.margen > 0 ? '#4ade80' : 'var(--text-muted)' }}>
                {kpis.margen.toFixed(1)}% de Margen de Utilidad
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px' }}>
                <Package size={16} /> Ticket Promedio
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.ticketPromedio)}</div>
            </div>
          </div>

          {/* Fila 2: Gráfico Diario de Costos vs Ganancias */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '8px' }}>Evolución Diaria: Costos vs Ganancia</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>
              El total de la columna representa los ingresos del día.
            </p>
            <div style={{ height: '320px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ fontWeight: 'bold' }}
                      formatter={(value) => [`$${Number(value).toFixed(2)}`]}
                    />
                    <Legend iconType="circle" />
                    {/* Barras apiladas (Costo + Ganancia = Ingreso Total) */}
                    <Bar dataKey="costo" name="Costo" stackId="a" fill="#f87171" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="ganancia" name="Ganancia Libre" stackId="a" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  No hay suficientes datos registrados en este periodo.
                </div>
              )}
            </div>
          </div>

          {/* Fila 3: Top Productos, Top Vendedores y Métodos de Pago */}
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
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.transactions} transacciones hechas</div>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--primary)' }}>
                        {formatCurrency(v.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Sin datos de vendedores.</div>
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
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.quantity} unid. vendidas</div>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
                        {formatCurrency(p.revenue)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Sin datos de productos.</div>
              )}
            </div>

            {/* Métodos de Pago (Gráfico Circular) */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <CreditCard size={20} style={{ color: 'var(--primary)' }} />
                <h3>Métodos de Pago</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>Porción de ingresos por vía.</p>
              
              <div style={{ height: '220px' }}>
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
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos de pago.</div>
                )}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Reportes;
