import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useTenantStore } from '../../store/useTenantStore';
import { PieChart, Download } from 'lucide-react';

const ReportesHR = () => {
  const { tenantInfo } = useTenantStore();
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantInfo?.id) fetchPayroll();
  }, [tenantInfo]);

  const fetchPayroll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hr_payroll')
      .select('*')
      .eq('tenant_id', tenantInfo.id)
      .order('period_start', { ascending: false });
      
    if (!error && data) setPayrollRecords(data);
    setLoading(false);
  };

  const periods = [...new Set(payrollRecords.map(r => `${r.period_start} a ${r.period_end}`))];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Reportes Consolidados RRHH</h1>
          <p className="page-subtitle">Totales retenidos de ISSS, AFP y Renta para declaraciones.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Generando reportes...</div>
      ) : periods.length === 0 ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No hay datos de planilla para mostrar.
        </div>
      ) : (
        periods.map(periodStr => {
          const records = payrollRecords.filter(r => `${r.period_start} a ${r.period_end}` === periodStr);
          
          const totalISSS = records.reduce((sum, r) => sum + Number(r.isss_deduction || 0), 0);
          const totalAFP = records.reduce((sum, r) => sum + Number(r.afp_deduction || 0), 0);
          const totalRenta = records.reduce((sum, r) => sum + Number(r.renta_deduction || 0), 0);
          const totalNeto = records.reduce((sum, r) => sum + Number(r.net_salary || 0), 0);
          const totalIngresos = records.reduce((sum, r) => sum + Number(r.base_salary) + Number(r.commissions) + Number(r.overtime_pay) + Number(r.vacation_bonus) + Number(r.bonuses), 0);

          return (
            <div key={periodStr} className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={20} color="var(--primary)" /> Período: {periodStr}
              </h2>

              <div className="grid-4" style={{ marginBottom: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Total Ingresos Brutos</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${totalIngresos.toFixed(2)}</div>
                </div>
                
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>Retención ISSS (3%)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>${totalISSS.toFixed(2)}</div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>Retención AFP (7.25%)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>${totalAFP.toFixed(2)}</div>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#ef4444', marginBottom: '8px' }}>Retención ISR (Renta)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>${totalRenta.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e' }}>Planilla Neta a Pagar</span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#22c55e' }}>${totalNeto.toFixed(2)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ReportesHR;
