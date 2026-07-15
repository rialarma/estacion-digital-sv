import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, ArrowDownRight, ArrowUpRight, Percent, Briefcase } from 'lucide-react';

const DashboardFinanciero = ({ tenantId, isoStart }) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ ingresos: 0, gastos: 0, utilidad: 0, margen: 0 });
  const [chartData, setChartData] = useState([]);
  const [distData, setDistData] = useState([]);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6']; // Gastos colores

  useEffect(() => {
    if (tenantId && isoStart) {
      fetchData();
    }
  }, [tenantId, isoStart]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Ingresos (Ventas)
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart)
        .order('created_at', { ascending: true });

      // 2. Compras (Gastos Operativos / Inventario)
      const { data: purchasesData, error: purchError } = await supabase
        .from('purchases')
        .select('total, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart)
        .order('created_at', { ascending: true });

      // 3. Nómina (Gastos Administrativos)
      const { data: payrollData, error: payrollError } = await supabase
        .from('hr_payroll')
        .select('total_amount, created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart);

      if (salesError) throw salesError;

      let totalIngresos = 0;
      let totalCompras = 0;
      let totalNomina = 0;

      const dailyData = {};

      // Procesar Ventas
      salesData?.forEach(sale => {
        const amt = Number(sale.total);
        totalIngresos += amt;
        
        const dateObj = new Date(sale.created_at);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        if (!dailyData[dateStr]) dailyData[dateStr] = { fecha: dateStr, ingresos: 0, gastos: 0 };
        dailyData[dateStr].ingresos += amt;
      });

      // Procesar Compras
      purchasesData?.forEach(purch => {
        const amt = Number(purch.total);
        totalCompras += amt;
        
        const dateObj = new Date(purch.created_at);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        if (!dailyData[dateStr]) dailyData[dateStr] = { fecha: dateStr, ingresos: 0, gastos: 0 };
        dailyData[dateStr].gastos += amt;
      });

      // Procesar Nómina
      payrollData?.forEach(pay => {
        const amt = Number(pay.total_amount);
        totalNomina += amt;
        
        const dateObj = new Date(pay.created_at);
        const dateStr = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        if (!dailyData[dateStr]) dailyData[dateStr] = { fecha: dateStr, ingresos: 0, gastos: 0 };
        dailyData[dateStr].gastos += amt;
      });

      const totalGastos = totalCompras + totalNomina;
      const utilidad = totalIngresos - totalGastos;
      const margen = totalGastos > 0 ? (utilidad / totalGastos) * 100 : 0;

      setKpis({
        ingresos: totalIngresos,
        gastos: totalGastos,
        utilidad: utilidad,
        margen: margen
      });

      setChartData(Object.values(dailyData));

      setDistData([
        { name: 'Compras (Inventario)', value: totalCompras },
        { name: 'Nómina (RRHH)', value: totalNomina }
      ].filter(d => d.value > 0));

    } catch (err) {
      console.error('Error fetching financiero:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos financieros...</div>;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <DollarSign size={16} /> INGRESOS TOTALES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4ade80' }}>{formatCurrency(kpis.ingresos)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <ArrowDownRight size={16} /> GASTOS TOTALES
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(kpis.gastos)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <ArrowUpRight size={16} /> UTILIDAD NETA
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: kpis.utilidad >= 0 ? '#4ade80' : '#ef4444' }}>
            {formatCurrency(kpis.utilidad)}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <Percent size={16} /> MARGEN NETO
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{kpis.margen.toFixed(1)}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* Gráfico Barras */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px' }}>Ingresos vs Gastos</h3>
          <div style={{ height: '300px' }}>
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
                  <Bar dataKey="ingresos" name="Ingresos" fill="#4ade80" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin datos</div>
            )}
          </div>
        </div>

        {/* Gráfico Dona */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            <Briefcase size={20} style={{ color: 'var(--primary)' }} />
            <h3>Distribución de Gastos</h3>
          </div>
          <div style={{ height: '300px' }}>
            {distData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distData.map((entry, index) => (
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
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Sin gastos registrados.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFinanciero;
