import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, DollarSign, Percent, Users } from 'lucide-react';

const DashboardGerencial = ({ tenantId, isoStart }) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ ingresos: 0, utilidad: 0, margen: 0, clientes: 0 });
  const [chartData, setChartData] = useState([]);

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
          client_id,
          sale_items ( quantity, unit_cost )
        `)
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart)
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      let totalIngresos = 0;
      let totalCosto = 0;
      const clientesUnicos = new Set();
      const dailyData = {};

      salesData.forEach(sale => {
        const saleTotal = Number(sale.total);
        totalIngresos += saleTotal;
        if (sale.client_id) clientesUnicos.add(sale.client_id);
        
        let saleCost = 0;
        if (sale.sale_items) {
          sale.sale_items.forEach(item => {
            saleCost += (Number(item.quantity) * Number(item.unit_cost || 0));
          });
        }
        totalCosto += saleCost;

        const dateObj = new Date(sale.created_at);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        
        if (!dailyData[dateStr]) {
          dailyData[dateStr] = { fecha: dateStr, ingresos: 0, utilidad: 0 };
        }
        dailyData[dateStr].ingresos += saleTotal;
        dailyData[dateStr].utilidad += (saleTotal - saleCost);
      });

      const utilidad = totalIngresos - totalCosto;
      const margen = totalIngresos > 0 ? (utilidad / totalIngresos) * 100 : 0;

      setKpis({
        ingresos: totalIngresos,
        utilidad: utilidad,
        margen: margen,
        clientes: clientesUnicos.size
      });
      setChartData(Object.values(dailyData));

    } catch (err) {
      console.error('Error fetching gerencial:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos gerenciales...</div>;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <DollarSign size={16} /> INGRESOS TOTALES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.ingresos)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <TrendingUp size={16} /> UTILIDAD NETA
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80' }}>{formatCurrency(kpis.utilidad)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <Percent size={16} /> MARGEN NETO
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#60a5fa' }}>{kpis.margen.toFixed(1)}%</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <Users size={16} /> CLIENTES ACTIVOS
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f59e0b' }}>{kpis.clientes}</div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '24px' }}>Evolución de Ingresos y Utilidad</h3>
        <div style={{ height: '350px' }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                  formatter={(value) => [`$${Number(value).toFixed(2)}`]}
                />
                <Legend iconType="circle" />
                <Line yAxisId="left" type="monotone" dataKey="ingresos" name="Ingresos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="utilidad" name="Utilidad Neta" stroke="#4ade80" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No hay suficientes datos registrados en este periodo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardGerencial;
