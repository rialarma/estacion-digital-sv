import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useTenantStore } from '../../store/useTenantStore';
import { FileText, Plus, Edit2, CheckCircle, Save, Trash2, Calculator } from 'lucide-react';

const calculateDeductions = (monthlySalary) => {
  const ISSS_RATE = 0.03;
  const AFP_RATE = 0.0725;
  const ISSS_CAP = 1000;
  
  const isss_total = Math.min(monthlySalary, ISSS_CAP) * ISSS_RATE;
  const afp_total = monthlySalary * AFP_RATE;
  
  const salary_after_afp = monthlySalary - isss_total - afp_total;
  let renta_total = 0;
  
  if (salary_after_afp <= 472.00) {
    renta_total = 0;
  } else if (salary_after_afp <= 895.24) {
    renta_total = (salary_after_afp - 472.00) * 0.10 + 17.67;
  } else if (salary_after_afp <= 2038.10) {
    renta_total = (salary_after_afp - 895.24) * 0.20 + 60.00;
  } else {
    renta_total = (salary_after_afp - 2038.10) * 0.30 + 288.57;
  }
  
  return { isss: isss_total, afp: afp_total, renta: renta_total };
};

const Planilla = () => {
  const { tenantInfo } = useTenantStore();
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [editingRecord, setEditingRecord] = useState(null);
  
  const [periodData, setPeriodData] = useState({
    period_start: '',
    period_end: '',
    period_type: 'QUINCENAL'
  });

  useEffect(() => {
    if (tenantInfo?.id) fetchPayroll();
  }, [tenantInfo]);

  const fetchPayroll = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hr_payroll')
      .select('*, hr_employees(first_name, last_name, document_id, hr_positions(name))')
      .order('period_start', { ascending: false })
      .order('id');
      
    if (!error && data) setPayrollRecords(data);
    setLoading(false);
  };

  const handlePeriodChange = (e) => {
    setPeriodData({ ...periodData, [e.target.name]: e.target.value });
  };

  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    if (!tenantInfo?.id) return;
    setGenerating(true);
    
    try {
      // 1. Fetch active employees
      const { data: employees, error: empError } = await supabase
        .from('hr_employees')
        .select('id, base_salary')
        .eq('status', 'ACTIVO')
        .eq('tenant_id', tenantInfo.id);
        
      if (empError) throw empError;
      if (!employees || employees.length === 0) {
        alert('No hay empleados activos.');
        setGenerating(false); return;
      }

      // 2. Fetch Attendances in Period
      const { data: attData } = await supabase
        .from('hr_attendance')
        .select('employee_id, overtime_hours')
        .eq('tenant_id', tenantInfo.id)
        .gte('date', periodData.period_start)
        .lte('date', periodData.period_end);

      // 3. Fetch Vacations in Period
      const { data: vacData } = await supabase
        .from('hr_vacations')
        .select('employee_id, paid_amount')
        .eq('tenant_id', tenantInfo.id)
        .eq('status', 'APROBADO')
        .gte('start_date', periodData.period_start)
        .lte('end_date', periodData.period_end);

      // Aggregate Att & Vac
      const overtimeMap = {};
      attData?.forEach(a => {
        overtimeMap[a.employee_id] = (overtimeMap[a.employee_id] || 0) + Number(a.overtime_hours || 0);
      });
      
      const vacMap = {};
      vacData?.forEach(v => {
        vacMap[v.employee_id] = (vacMap[v.employee_id] || 0) + Number(v.paid_amount || 0);
      });

      const payload = employees.map(emp => {
        const monthlyBase = Number(emp.base_salary) || 0;
        let periodBase = monthlyBase;
        let isss = 0, afp = 0, renta = 0;
        
        // Calculate overtime pay = (monthlyBase / 30 / 8) * 2 * overtimeHours
        const overtimeHrs = overtimeMap[emp.id] || 0;
        const overtimePay = monthlyBase > 0 ? (monthlyBase / 30 / 8) * 2 * overtimeHrs : 0;
        
        // Vacation Bonus
        const vacationBonus = vacMap[emp.id] || 0;
        
        // Total taxable base for deductions
        const taxableBase = monthlyBase + overtimePay + vacationBonus;
        
        if (periodData.period_type === 'MENSUAL') {
          periodBase = monthlyBase;
          const deds = calculateDeductions(taxableBase);
          isss = deds.isss; afp = deds.afp; renta = deds.renta;
        } else if (periodData.period_type === 'QUINCENAL_LIBRE_1') {
          periodBase = monthlyBase / 2;
          isss = 0; afp = 0; renta = 0;
        } else if (periodData.period_type === 'QUINCENAL_DESCUENTO_2') {
          periodBase = monthlyBase / 2;
          const deds = calculateDeductions(taxableBase);
          isss = deds.isss; afp = deds.afp; renta = deds.renta;
        } else if (periodData.period_type === 'QUINCENAL') {
          periodBase = monthlyBase / 2;
          const deds = calculateDeductions(taxableBase); 
          isss = deds.isss / 2; afp = deds.afp / 2; renta = deds.renta / 2;
        }

        return {
          tenant_id: tenantInfo.id,
          employee_id: emp.id,
          period_start: periodData.period_start,
          period_end: periodData.period_end,
          period_type: periodData.period_type,
          base_salary: periodBase,
          commissions: 0,
          overtime_pay: Number(overtimePay.toFixed(2)),
          vacation_bonus: Number(vacationBonus.toFixed(2)),
          isss_deduction: isss,
          afp_deduction: afp,
          renta_deduction: renta,
          bonuses: 0,
          deductions: 0,
          status: 'PENDIENTE'
        };
      });

      const { error: insertError } = await supabase.from('hr_payroll').insert(payload);
      if (insertError) throw insertError;
      
      alert('Planilla generada exitosamente con cálculos de ley.');
      setShowGenerateModal(false);
      fetchPayroll();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const startEditing = (record) => {
    setEditingRecord({ ...record });
  };

  const saveEdit = async () => {
    try {
      const { error } = await supabase
        .from('hr_payroll')
        .update({
          base_salary: parseFloat(editingRecord.base_salary) || 0,
          commissions: parseFloat(editingRecord.commissions) || 0,
          overtime_pay: parseFloat(editingRecord.overtime_pay) || 0,
          vacation_bonus: parseFloat(editingRecord.vacation_bonus) || 0,
          isss_deduction: parseFloat(editingRecord.isss_deduction) || 0,
          afp_deduction: parseFloat(editingRecord.afp_deduction) || 0,
          renta_deduction: parseFloat(editingRecord.renta_deduction) || 0,
          bonuses: parseFloat(editingRecord.bonuses) || 0,
          deductions: parseFloat(editingRecord.deductions) || 0
        })
        .eq('id', editingRecord.id);
        
      if (error) throw error;
      setEditingRecord(null);
      fetchPayroll();
    } catch (error) {
      alert('Error actualizando: ' + error.message);
    }
  };

  const markAsPaid = async (id) => {
    if (window.confirm('¿Marcar como PAGADO?')) {
      const { error } = await supabase.from('hr_payroll').update({
        status: 'PAGADO', payment_date: new Date().toISOString().split('T')[0]
      }).eq('id', id);
      if (!error) fetchPayroll();
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este registro de planilla?')) {
      const { error } = await supabase.from('hr_payroll').delete().eq('id', id);
      if (!error) fetchPayroll();
    }
  };

  const handleDeletePeriod = async (start, end, type) => {
    if (window.confirm(`¿Está seguro de eliminar TODOS los registros de la planilla del período ${start} a ${end} (${type})? Esta acción no se puede deshacer.`)) {
      const { error } = await supabase
        .from('hr_payroll')
        .delete()
        .eq('tenant_id', tenantInfo.id)
        .eq('period_start', start)
        .eq('period_end', end)
        .eq('period_type', type);
        
      if (!error) {
        alert('Planilla eliminada exitosamente.');
        fetchPayroll();
      } else {
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  const periods = [...new Set(payrollRecords.map(r => `${r.period_start} a ${r.period_end} (${r.period_type || 'MENSUAL'})`))];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Motor de Planillas</h1>
          <p className="page-subtitle">Nómina empresarial con cálculo automático de AFP, ISSS y Renta.</p>
        </div>
        <button className="glass-button" onClick={() => {
          const today = new Date();
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
          setPeriodData({ period_start: firstDay, period_end: lastDay, period_type: 'QUINCENAL' });
          setShowGenerateModal(true);
        }}>
          <Calculator size={18} /> Calcular Planilla
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando planillas...</div>
      ) : periods.length === 0 ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay planillas generadas.</div>
      ) : (
        periods.map(periodStr => {
          const records = payrollRecords.filter(r => `${r.period_start} a ${r.period_end} (${r.period_type || 'MENSUAL'})` === periodStr);
          const totalNeto = records.reduce((sum, r) => sum + Number(r.net_salary), 0);
          
          return (
            <div key={periodStr} className="glass-panel" style={{ marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Período: {periodStr}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '18px' }}>
                    Total a Pagar: ${totalNeto.toFixed(2)}
                  </div>
                  <button 
                    className="glass-button" 
                    style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'transparent', fontSize: '13px' }}
                    onClick={() => handleDeletePeriod(records[0].period_start, records[0].period_end, records[0].period_type)}
                    title="Eliminar todo este período de planilla"
                  >
                    <Trash2 size={16} /> Borrar Período
                  </button>
                </div>
              </div>
              
              <div style={{ overflowX: 'auto', padding: '16px' }}>
                <table className="glass-table" style={{ minWidth: '1200px', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>Empleado</th>
                      <th>Base ($)</th>
                      <th>Comis/H.Ext ($)</th>
                      <th>Vacs/Otros Bonos</th>
                      <th style={{ color: '#ef4444' }}>ISSS ($)</th>
                      <th style={{ color: '#ef4444' }}>AFP ($)</th>
                      <th style={{ color: '#ef4444' }}>Renta ($)</th>
                      <th style={{ color: '#ef4444' }}>Otras Ded. ($)</th>
                      <th style={{ color: '#22c55e' }}>Neto a Pagar</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => {
                      const isEditing = editingRecord?.id === r.id;
                      
                      const InputField = ({ field }) => (
                        <input type="number" step="0.01" className="glass-input" 
                          style={{ width: '70px', padding: '4px', fontSize: '12px', background: 'rgba(255,255,255,0.1)' }} 
                          value={editingRecord[field]} onChange={e => setEditingRecord({...editingRecord, [field]: e.target.value})} 
                        />
                      );

                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 500, minWidth: '150px' }}>
                            {r.hr_employees?.first_name} {r.hr_employees?.last_name}
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {r.status === 'PAGADO' ? <span style={{color: '#22c55e'}}>✓ PAGADO</span> : 'PENDIENTE'}
                            </div>
                          </td>
                          
                          <td>{isEditing ? <InputField field="base_salary" /> : Number(r.base_salary).toFixed(2)}</td>
                          
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{fontSize:'10px', width:'25px'}}>Com</span><InputField field="commissions" /></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{fontSize:'10px', width:'25px'}}>H.E.</span><InputField field="overtime_pay" /></div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                                <span>C: {Number(r.commissions||0).toFixed(2)}</span>
                                <span>H: {Number(r.overtime_pay||0).toFixed(2)}</span>
                              </div>
                            )}
                          </td>
                          
                          <td>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{fontSize:'10px', width:'25px'}}>Vac</span><InputField field="vacation_bonus" /></div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{fontSize:'10px', width:'25px'}}>Bon</span><InputField field="bonuses" /></div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                                <span>V: {Number(r.vacation_bonus||0).toFixed(2)}</span>
                                <span>B: {Number(r.bonuses||0).toFixed(2)}</span>
                              </div>
                            )}
                          </td>
                          
                          <td style={{ color: '#ef4444' }}>{isEditing ? <InputField field="isss_deduction" /> : Number(r.isss_deduction||0).toFixed(2)}</td>
                          <td style={{ color: '#ef4444' }}>{isEditing ? <InputField field="afp_deduction" /> : Number(r.afp_deduction||0).toFixed(2)}</td>
                          <td style={{ color: '#ef4444' }}>{isEditing ? <InputField field="renta_deduction" /> : Number(r.renta_deduction||0).toFixed(2)}</td>
                          <td style={{ color: '#ef4444' }}>{isEditing ? <InputField field="deductions" /> : Number(r.deductions||0).toFixed(2)}</td>
                          
                          <td style={{ fontWeight: 'bold', color: 'var(--success)', fontSize: '15px' }}>
                            ${Number(r.net_salary).toFixed(2)}
                          </td>

                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {isEditing ? (
                                <button className="glass-button" style={{ padding: '6px', color: 'var(--success)' }} onClick={saveEdit}><Save size={16} /></button>
                              ) : (
                                <>
                                  <button className="glass-button" style={{ padding: '6px' }} onClick={() => startEditing(r)} disabled={r.status === 'PAGADO'}><Edit2 size={16} /></button>
                                  {r.status !== 'PAGADO' && (
                                    <button className="glass-button" style={{ padding: '6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: 'transparent' }} onClick={() => markAsPaid(r.id)}><CheckCircle size={16} /></button>
                                  )}
                                  <button className="glass-button" style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'transparent' }} onClick={() => handleDelete(r.id)}><Trash2 size={16} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}

      {showGenerateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Calculator size={24} /> Asistente de Planilla</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Se calculará automáticamente el ISSS, AFP y Renta de todos los empleados activos según el salario base y el período seleccionado.
            </p>
            <form onSubmit={handleGeneratePayroll}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Tipo de Pago *</label>
                <select required className="glass-input" name="period_type" value={periodData.period_type} onChange={handlePeriodChange}>
                  <option value="MENSUAL">Mensual (100% Descuentos)</option>
                  <option value="QUINCENAL">Quincenal Normal (50% Descuentos c/u)</option>
                  <option value="QUINCENAL_LIBRE_1">Quincena Libre (Sin Ley, Ej: 1-15)</option>
                  <option value="QUINCENAL_DESCUENTO_2">Quincena con Ley (100% Ley, Ej: 16-30/31)</option>
                </select>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label>Desde *</label>
                  <input required type="date" className="glass-input" name="period_start" value={periodData.period_start} onChange={handlePeriodChange} />
                </div>
                <div className="form-group">
                  <label>Hasta *</label>
                  <input required type="date" className="glass-input" name="period_end" value={periodData.period_end} onChange={handlePeriodChange} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setShowGenerateModal(false)} disabled={generating}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={generating}>
                  {generating ? 'Calculando...' : 'Calcular Planilla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Planilla;
