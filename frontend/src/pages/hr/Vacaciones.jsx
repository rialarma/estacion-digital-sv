import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useTenantStore } from '../../store/useTenantStore';
import { Calendar, Plus, Save, Trash2, Calculator } from 'lucide-react';

const Vacaciones = () => {
  const { tenantInfo } = useTenantStore();
  const [vacations, setVacations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    return_date: '',
    notes: '',
    status: 'APROBADO',
    paid_amount: 0
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchEmployees();
      fetchVacations();
    }
  }, [tenantInfo]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('hr_employees')
      .select('id, first_name, last_name, status, base_salary')
      .eq('tenant_id', tenantInfo.id)
      .eq('status', 'ACTIVO')
      .order('first_name');
    if (data) setEmployees(data);
  };

  const fetchVacations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hr_vacations')
      .select('*, hr_employees(first_name, last_name, base_salary)')
      .eq('tenant_id', tenantInfo.id)
      .order('start_date', { ascending: false });
    
    if (!error && data) setVacations(data);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const calculatePremium = () => {
    if (!formData.employee_id) return alert('Seleccione empleado primero');
    const emp = employees.find(e => e.id === formData.employee_id);
    if (!emp) return;
    
    // El Salvador: 15 days paid at 130%. 
    // The regular 100% (15 days) is usually paid in the regular payroll.
    // The 30% premium is the extra amount.
    // Base salary is monthly. 15 days = base / 2.
    // Total vacation pay = (base/2) * 1.30
    // Extra bonus to add in Planilla = (base/2) * 0.30
    const monthlyBase = Number(emp.base_salary) || 0;
    const premium = (monthlyBase / 2) * 0.30;
    
    setFormData({ ...formData, paid_amount: premium.toFixed(2) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) return alert('Seleccione un empleado');
    
    try {
      const { error } = await supabase
        .from('hr_vacations')
        .insert([{
          tenant_id: tenantInfo.id,
          employee_id: formData.employee_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          return_date: formData.return_date,
          status: formData.status,
          paid_amount: parseFloat(formData.paid_amount) || 0,
          notes: formData.notes
        }]);
        
      if (error) throw error;
      
      alert('Vacaciones registradas exitosamente. Recuerda agregar la Prima Vacacional manualmente al generar la planilla de este mes.');
      setFormData({
        employee_id: '', start_date: '', end_date: '', return_date: '', notes: '', status: 'APROBADO', paid_amount: 0
      });
      fetchVacations();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este registro de vacaciones?')) {
      const { error } = await supabase.from('hr_vacations').delete().eq('id', id);
      if (!error) fetchVacations();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Gestión de Vacaciones</h1>
          <p className="page-subtitle">Programa períodos vacacionales y calcula la Prima del 30% (Ley de El Salvador).</p>
        </div>
      </div>

      <div className="grid-2-1">
        {/* Tabla Histórica */}
        <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} color="var(--primary)" /> Calendario de Vacaciones
          </h2>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
          ) : (
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Regresa</th>
                  <th>Prima Vac. (30%)</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {vacations.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}>{v.hr_employees?.first_name} {v.hr_employees?.last_name}</td>
                    <td>{v.start_date}</td>
                    <td>{v.end_date}</td>
                    <td>{v.return_date || '-'}</td>
                    <td style={{ color: '#22c55e', fontWeight: 'bold' }}>${Number(v.paid_amount).toFixed(2)}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        background: v.status === 'APROBADO' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: v.status === 'APROBADO' ? '#22c55e' : '#94a3b8'
                      }}>
                        {v.status}
                      </span>
                    </td>
                    <td>
                      <button className="glass-button" style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => handleDelete(v.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {vacations.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay vacaciones programadas.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Formulario */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--primary)" /> Programar Vacación
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Empleado *</label>
              <select required className="glass-input" name="employee_id" value={formData.employee_id} onChange={handleChange}>
                <option value="">-- Seleccionar --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name} (${e.base_salary})</option>
                ))}
              </select>
            </div>
            
            <div className="grid-1-1">
              <div className="form-group">
                <label>Fecha Inicio *</label>
                <input required type="date" className="glass-input" name="start_date" value={formData.start_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Fecha Fin *</label>
                <input required type="date" className="glass-input" name="end_date" value={formData.end_date} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Fecha de Regreso a Labores</label>
              <input type="date" className="glass-input" name="return_date" value={formData.return_date} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Prima Vacacional (Solo 30%)
                <button type="button" onClick={calculatePremium} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <Calculator size={12} /> Calcular
                </button>
              </label>
              <input type="number" step="0.01" className="glass-input" name="paid_amount" value={formData.paid_amount} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Notas</label>
              <textarea className="glass-input" name="notes" rows={2} value={formData.notes} onChange={handleChange} />
            </div>
            
            <button type="submit" className="glass-button" style={{ width: '100%', justifyContent: 'center' }}>
              <Save size={18} /> Guardar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Vacaciones;
