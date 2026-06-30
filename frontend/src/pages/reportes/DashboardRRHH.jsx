import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, UserCheck, DollarSign, Calendar } from 'lucide-react';

const DashboardRRHH = ({ tenantId, isoStart }) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ empleados: 0, costoNomina: 0, asistenciasHoy: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (tenantId && isoStart) {
      fetchData();
    }
  }, [tenantId, isoStart]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Empleados totales
      const { data: empData, error: empError } = await supabase
        .from('hr_employees')
        .select('id, hire_date, department')
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE');
      
      // 2. Costo de nómina (período)
      const { data: payrollData, error: payError } = await supabase
        .from('hr_payroll')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .gte('created_at', isoStart);

      // 3. Asistencias (hoy)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const { data: attData, error: attError } = await supabase
        .from('hr_attendance') // Or employee_attendance, depending on schema. We will use hr_attendance based on Planilla.jsx
        .select('id, employee_id, clock_in')
        .eq('tenant_id', tenantId)
        .gte('clock_in', startOfToday.toISOString());

      let nominaTotal = 0;
      payrollData?.forEach(p => nominaTotal += Number(p.total_amount || 0));

      setKpis({
        empleados: empData?.length || 0,
        costoNomina: nominaTotal,
        asistenciasHoy: new Set(attData?.map(a => a.employee_id)).size // Únicos empleados que marcaron hoy
      });

      // Distribución por departamento
      const deptCount = {};
      empData?.forEach(e => {
        const dept = e.department || 'Sin Departamento';
        if (!deptCount[dept]) deptCount[dept] = 0;
        deptCount[dept]++;
      });

      setChartData(Object.keys(deptCount).map(k => ({
        name: k, empleados: deptCount[k]
      })));

    } catch (err) {
      console.error('Error fetching rrhh:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos de RRHH...</div>;

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <Users size={16} /> COLABORADORES ACTIVOS
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#3b82f6' }}>{kpis.empleados}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <DollarSign size={16} /> COSTO DE NÓMINA
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold' }}>{formatCurrency(kpis.costoNomina)}</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '8px' }}>
            <UserCheck size={16} /> ASISTENCIA (HOY)
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#10b981' }}>{kpis.asistenciasHoy} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 'normal' }}>de {kpis.empleados}</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        
        {/* Gráfico Barras */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '24px' }}>Colaboradores por Departamento</h3>
          <div style={{ height: '300px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="empleados" name="Empleados" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
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

export default DashboardRRHH;
