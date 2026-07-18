import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useTenantStore } from '../../store/useTenantStore';
import { Clock, Plus, Save, Trash2, RefreshCw, CheckSquare } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

const AsistenciaHR = () => {
  const { tenantInfo } = useTenantStore();
  const [attendances, setAttendances] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    regular_hours: 8,
    overtime_hours: 0,
    notes: ''
  });

  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  };

  const [syncStartDate, setSyncStartDate] = useState(getFirstDayOfMonth());
  const [syncEndDate, setSyncEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchEmployees();
      fetchAttendances();
    }
  }, [tenantInfo]);

  const fetchEmployees = async () => {
    // Necesitamos el user_id para vincular con las marcaciones
    const { data } = await supabase
      .from('hr_employees')
      .select('id, user_id, first_name, last_name, status')
      .eq('tenant_id', tenantInfo.id)
      .eq('status', 'ACTIVO')
      .order('first_name');
    if (data) setEmployees(data);
  };

  const fetchAttendances = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hr_attendance')
      .select('*, hr_employees(first_name, last_name)')
      .eq('tenant_id', tenantInfo.id)
      .order('date', { ascending: false });
    
    if (!error && data) setAttendances(data);
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee_id) return alert('Seleccione un empleado');
    
    try {
      const { error } = await supabase
        .from('hr_attendance')
        .upsert({
          tenant_id: tenantInfo.id,
          employee_id: formData.employee_id,
          date: formData.date,
          regular_hours: parseFloat(formData.regular_hours) || 0,
          overtime_hours: parseFloat(formData.overtime_hours) || 0,
          notes: formData.notes
        }, { onConflict: 'tenant_id, employee_id, date' });
        
      if (error) throw error;
      
      alert('Registro guardado exitosamente.');
      setFormData({ ...formData, overtime_hours: 0, notes: '' });
      fetchAttendances();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este registro de asistencia?')) {
      const { error } = await supabase.from('hr_attendance').delete().eq('id', id);
      if (!error) fetchAttendances();
    }
  };

  const handleSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(attendances.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`¿Está seguro de eliminar ${selectedIds.length} registros seleccionados de forma masiva?`)) {
      const { error } = await supabase.from('hr_attendance').delete().in('id', selectedIds);
      if (!error) {
        setSelectedIds([]);
        fetchAttendances();
      } else {
        alert('Error eliminando registros masivos: ' + error.message);
      }
    }
  };

  // Función para importar datos del módulo de marcación
  const handleSync = async () => {
    if (!syncStartDate || !syncEndDate) return alert('Seleccione un rango de fechas para sincronizar');
    setSyncing(true);
    try {
      // 1. Obtener marcaciones del kiosko para el rango de fechas
      const { data: rawLogs, error: logError } = await supabase
        .from('employee_attendance')
        .select(`
          clock_in, clock_out, user_id,
          user_profiles (shift_start, shift_end, saturday_shift_start, saturday_shift_end, sunday_shift_start, sunday_shift_end)
        `)
        .eq('tenant_id', tenantInfo.id)
        .gte('clock_in', `${syncStartDate}T00:00:00.000Z`)
        .lte('clock_in', `${syncEndDate}T23:59:59.999Z`)
        .not('clock_out', 'is', null);

      if (logError) throw logError;
      if (!rawLogs || rawLogs.length === 0) {
        alert('No se encontraron marcaciones completadas (con salida) para este rango de fechas.');
        setSyncing(false);
        return;
      }

      // Agrupar por empleado Y por fecha
      const report = {};
      rawLogs.forEach(log => {
        const uid = log.user_id;
        const p = log.user_profiles;
        if (!p) return;

        // Extraer la fecha local de la marcación (clock_in)
        const dateObj = new Date(log.clock_in);
        // Formatear como YYYY-MM-DD
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const key = `${uid}_${dateStr}`;

        if (!report[key]) {
          report[key] = { uid, dateStr, total_ms: 0, expected_ms: 0 };
          
          const dayOfWeek = dateObj.getDay();
          
          let s_start = p.shift_start;
          let s_end = p.shift_end;
          if (dayOfWeek === 6) { s_start = p.saturday_shift_start; s_end = p.saturday_shift_end; } 
          else if (dayOfWeek === 0) { s_start = p.sunday_shift_start; s_end = p.sunday_shift_end; }

          if (s_start && s_end) {
            const [sh, sm] = s_start.split(':').map(Number);
            const [eh, em] = s_end.split(':').map(Number);
            let totalMins = (eh * 60 + em) - (sh * 60 + sm);
            if (totalMins < 0) totalMins += 24 * 60;
            report[key].expected_ms = totalMins * 60000;
          }
        }
        
        report[key].total_ms += (new Date(log.clock_out) - new Date(log.clock_in));
      });

      // Preparar payload para hr_attendance
      const upsertPayload = [];
      
      for (const data of Object.values(report)) {
        // Buscar el hr_employee correspondiente al user_id
        const emp = employees.find(e => e.user_id === data.uid);
        if (emp) {
          const total_hrs = data.total_ms / 3600000;
          const expected_hrs = data.expected_ms / 3600000;
          
          // Calcular horas extra
          let regular = expected_hrs > 0 ? Math.min(total_hrs, expected_hrs) : total_hrs;
          let overtime = Math.max(0, total_hrs - expected_hrs);
          
          // Redondear a 2 decimales
          regular = Math.round(regular * 100) / 100;
          overtime = Math.round(overtime * 100) / 100;

          upsertPayload.push({
            tenant_id: tenantInfo.id,
            employee_id: emp.id,
            date: data.dateStr,
            regular_hours: regular,
            overtime_hours: overtime,
            notes: 'Sincronizado desde módulo de marcación'
          });
        }
      }

      if (upsertPayload.length === 0) {
        alert('No se pudieron enlazar las marcaciones con el Directorio de RRHH. Verifique que los empleados tengan su Usuario de Sistema enlazado en el directorio.');
        setSyncing(false);
        return;
      }

      const { error: upsertError } = await supabase
        .from('hr_attendance')
        .upsert(upsertPayload, { onConflict: 'tenant_id, employee_id, date' });

      if (upsertError) throw upsertError;

      alert(`Sincronización masiva exitosa. Se actualizaron ${upsertPayload.length} registros para ${syncStartDate} hasta ${syncEndDate}.`);
      fetchAttendances();
    } catch (err) {
      alert('Error sincronizando: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSmartDelete = async () => {
    if (!syncStartDate || !syncEndDate) return alert('Seleccione un rango de fechas');
    if (window.confirm(`¿Está seguro de eliminar TODOS los registros de asistencia desde ${syncStartDate} hasta ${syncEndDate}? Esta acción no se puede deshacer.`)) {
      const { error } = await supabase
        .from('hr_attendance')
        .delete()
        .eq('tenant_id', tenantInfo.id)
        .gte('date', syncStartDate)
        .lte('date', syncEndDate);
        
      if (!error) {
        alert('Registros del rango eliminados exitosamente.');
        fetchAttendances();
        setSelectedIds([]);
      } else {
        alert('Error al eliminar: ' + error.message);
      }
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Control de Asistencia y Horas Extra" icon={Clock}>
        <div>
          
          <p className="page-subtitle">Registra o sincroniza las horas trabajadas desde el Kiosko para el cálculo de planilla.</p>
        </div>
      </PageHeader>

      <div className="grid-2-1">
        {/* Tabla Histórica */}
        <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
          
          {/* Zona Superior de Tabla */}
          <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
              <Clock size={20} color="var(--primary)" /> Gestión Masiva de Marcaciones
            </h2>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted)' }}>Desde</label>
                <input 
                  type="date" 
                  className="glass-input" 
                  style={{ padding: '8px 12px' }}
                  value={syncStartDate} 
                  onChange={(e) => setSyncStartDate(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: 'var(--text-muted)' }}>Hasta</label>
                <input 
                  type="date" 
                  className="glass-input" 
                  style={{ padding: '8px 12px' }}
                  value={syncEndDate} 
                  onChange={(e) => setSyncEndDate(e.target.value)} 
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="glass-button" 
                  style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', height: '40px' }}
                  onClick={handleSync}
                  disabled={syncing}
                >
                  <RefreshCw size={16} className={syncing ? 'spin' : ''} />
                  {syncing ? 'Sincronizando...' : 'Importar Rango'}
                </button>
                
                <button 
                  className="glass-button" 
                  style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', height: '40px' }}
                  onClick={handleSmartDelete}
                  title="Borrar todos los registros en este rango de fechas"
                >
                  <Trash2 size={16} />
                  Borrar Rango
                </button>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', margin: 0 }}>Historial de Registros Aprobados</h3>
            {selectedIds.length > 0 && (
              <button 
                className="glass-button" 
                style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px' }}
                onClick={handleBulkDelete}
              >
                <Trash2 size={14} /> Eliminar {selectedIds.length} seleccionados
              </button>
            )}
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Cargando...</p>
          ) : (
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={attendances.length > 0 && selectedIds.length === attendances.length}
                    />
                  </th>
                  <th>Fecha</th>
                  <th>Empleado</th>
                  <th>Horas Normales</th>
                  <th>Horas Extra (Doble)</th>
                  <th>Notas</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map(a => (
                  <tr key={a.id} style={{ background: selectedIds.includes(a.id) ? 'rgba(59, 130, 246, 0.05)' : 'transparent' }}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(a.id)}
                        onChange={() => handleSelect(a.id)}
                      />
                    </td>
                    <td>{a.date}</td>
                    <td style={{ fontWeight: 500 }}>{a.hr_employees?.first_name} {a.hr_employees?.last_name}</td>
                    <td>{a.regular_hours}</td>
                    <td style={{ color: '#3b82f6', fontWeight: 'bold' }}>{a.overtime_hours > 0 ? a.overtime_hours : '-'}</td>
                    <td><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.notes}</span></td>
                    <td>
                      <button className="glass-button" style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={() => handleDelete(a.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {attendances.length === 0 && (
                  <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay registros de horas.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Formulario de Nuevo Registro Manual */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} color="var(--primary)" /> Registro Manual Extraordinario
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Empleado</label>
              <select required className="glass-input" name="employee_id" value={formData.employee_id} onChange={handleChange}>
                <option value="">-- Seleccionar --</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Fecha</label>
              <input required type="date" className="glass-input" name="date" value={formData.date} onChange={handleChange} />
            </div>
            
            <div className="grid-1-1">
              <div className="form-group">
                <label>Horas Ordinarias</label>
                <input required type="number" step="0.01" min="0" className="glass-input" name="regular_hours" value={formData.regular_hours} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Horas Extra</label>
                <input required type="number" step="0.01" min="0" className="glass-input" name="overtime_hours" value={formData.overtime_hours} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Notas / Motivo H.E.</label>
              <textarea className="glass-input" name="notes" rows={2} value={formData.notes} onChange={handleChange} placeholder="Ej: Cierre de mes, inventario..." />
            </div>
            
            <button type="submit" className="glass-button" style={{ width: '100%', justifyContent: 'center' }}>
              <Save size={18} /> Guardar Horas
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AsistenciaHR;
