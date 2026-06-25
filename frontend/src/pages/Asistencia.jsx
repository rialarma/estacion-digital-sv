import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Clock, Search, LogOut, CheckCircle, AlertCircle, MapPin, Calendar, FileText, BarChart2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTenantStore } from '../store/useTenantStore';

const Asistencia = () => {
  const { user } = useAuth();
  const { tenantInfo } = useTenantStore();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [activeTab, setActiveTab] = useState('detalle'); // 'detalle' | 'resumen'
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, [user, startDate, endDate]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    // 1. Obtener el rol del usuario actual
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profile) setRole(profile.role);

    // 2. Traer registros (Si es Admin/Gerente trae todos, si no, solo los suyos)
    let query = supabase
      .from('employee_attendance')
      .select(`
        *,
        user_profiles (id, first_name, last_name, role, shift_start, shift_end, saturday_shift_start, saturday_shift_end, sunday_shift_start, sunday_shift_end)
      `)
      .gte('clock_in', `${startDate}T00:00:00.000Z`)
      .lte('clock_in', `${endDate}T23:59:59.999Z`)
      .order('clock_in', { ascending: false });
      
    // Si no es ADMIN o GERENTE, solo ve sus propios registros
    if (profile && !['ADMIN', 'GERENTE'].includes(profile.role)) {
      query = query.eq('user_id', user.id);
    }

    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const name = `${log.user_profiles?.first_name || ''} ${log.user_profiles?.last_name || ''}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const formatDuration = (clockIn, clockOut) => {
    if (!clockOut) return 'En curso...';
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.floor((diffMs % 3600000) / 60000);
    return `${diffHrs}h ${diffMins}m`;
  };

  const generateReport = () => {
    const report = {};
    
    logs.forEach(log => {
      const p = log.user_profiles;
      if (!p) return;
      
      if (!report[p.id]) {
        report[p.id] = {
          name: `${p.first_name} ${p.last_name}`,
          role: p.role,
          shift_start: p.shift_start,
          shift_end: p.shift_end,
          days_worked: new Set(),
          late_arrivals: 0,
          total_ms: 0,
          expected_ms: 0,
        };
      }
      
      const dateObj = new Date(log.clock_in);
      const dateStr = dateObj.toISOString().split('T')[0];
      const dayOfWeek = dateObj.getDay();

      // Contar día y calcular horas esperadas una sola vez por día
      if (!report[p.id].days_worked.has(dateStr)) {
        report[p.id].days_worked.add(dateStr);
        
        let s_start = p.shift_start;
        let s_end = p.shift_end;
        if (dayOfWeek === 6) { // Sábado
          s_start = p.saturday_shift_start;
          s_end = p.saturday_shift_end;
        } else if (dayOfWeek === 0) { // Domingo
          s_start = p.sunday_shift_start;
          s_end = p.sunday_shift_end;
        }

        if (s_start && s_end) {
          const [sh, sm] = s_start.split(':').map(Number);
          const [eh, em] = s_end.split(':').map(Number);
          let totalMins = (eh * 60 + em) - (sh * 60 + sm);
          if (totalMins < 0) totalMins += 24 * 60;
          report[p.id].expected_ms += totalMins * 60000;
        }
      }
      
      // Contar llegadas tardías
      if (log.is_late) {
        report[p.id].late_arrivals += 1;
      }
      
      // Sumar horas
      if (log.clock_out) {
        report[p.id].total_ms += (new Date(log.clock_out) - new Date(log.clock_in));
      }
    });

    // Formatear array final
    return Object.values(report).map(r => {
      const overtime_ms = Math.max(0, r.total_ms - r.expected_ms);
      return {
        ...r,
        days_worked: r.days_worked.size,
        total_hours: Math.floor(r.total_ms / 3600000),
        total_mins: Math.floor((r.total_ms % 3600000) / 60000),
        overtime_hours: Math.floor(overtime_ms / 3600000),
        overtime_mins: Math.floor((overtime_ms % 3600000) / 60000),
      };
    }).filter(r => {
      if (!searchTerm) return true;
      return r.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  };

  const reportData = generateReport();

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Clock size={28} /> Control de Asistencia
          </h1>
          <p className="page-subtitle">Registro de entradas y salidas del personal.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        
        {/* Filtros Superiores */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Fecha Inicio</label>
            <input 
              type="date" 
              className="glass-input" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label>Fecha Fin</label>
            <input 
              type="date" 
              className="glass-input" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </div>
          {/* Solo mostramos la barra de búsqueda a ADMIN y GERENTE, ya que los demás solo ven lo suyo */}
          {['ADMIN', 'GERENTE'].includes(role) && (
            <div className="form-group" style={{ flex: 1, minWidth: '250px' }}>
              <label>Buscar Empleado</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Nombre del empleado..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Pestañas */}
        <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveTab('detalle')}
            style={{ 
              background: 'none', border: 'none', padding: '12px 24px', cursor: 'pointer',
              color: activeTab === 'detalle' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'detalle' ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === 'detalle' ? 'bold' : 'normal',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Clock size={18} /> Registro Detallado
          </button>
          
          {['ADMIN', 'GERENTE'].includes(role) && (
            <button 
              onClick={() => setActiveTab('resumen')}
              style={{ 
                background: 'none', border: 'none', padding: '12px 24px', cursor: 'pointer',
                color: activeTab === 'resumen' ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === 'resumen' ? '2px solid var(--primary)' : '2px solid transparent',
                fontWeight: activeTab === 'resumen' ? 'bold' : 'normal',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <BarChart2 size={18} /> Resumen Acumulado
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Cargando registros...</div>
        ) : (
          <div className="table-responsive">
            {activeTab === 'detalle' ? (
              <table className="table">
                <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Empleado</th>
                  <th>Hora Entrada</th>
                  <th>Hora Salida</th>
                  <th>Ubicación</th>
                  <th>Duración</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.clock_in).toLocaleDateString()}</td>
                    <td style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {log.photo_url ? (
                        <img src={log.photo_url} alt="Selfie" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '14px' }}>{log.user_profiles?.first_name?.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <div>{log.user_profiles?.first_name} {log.user_profiles?.last_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{log.user_profiles?.role || 'N/A'}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: log.is_late ? '#ef4444' : '#10b981', fontWeight: log.is_late ? 'bold' : 'normal' }}>
                        {new Date(log.clock_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {log.is_late && <span style={{ fontSize: '10px', marginLeft: '4px' }}>(Tarde)</span>}
                      </span>
                    </td>
                    <td>{log.clock_out ? new Date(log.clock_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}</td>
                    <td>
                      {log.location_lat && log.location_lng ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${log.location_lat},${log.location_lng}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MapPin size={14} /> Ver GPS
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>No GPS</span>
                      )}
                    </td>
                    <td>{formatDuration(log.clock_in, log.clock_out)}</td>
                    <td>
                      {log.clock_out ? (
                        <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                          <CheckCircle size={14} /> Completado
                        </span>
                      ) : (
                        <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                          <AlertCircle size={14} /> En curso
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>
                      No se encontraron registros de asistencia.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Rol</th>
                    <th>L-V</th>
                    <th>Sáb</th>
                    <th>Dom</th>
                    <th style={{ textAlign: 'center' }}>Días Trab.</th>
                    <th style={{ textAlign: 'center' }}>Tardías</th>
                    <th style={{ textAlign: 'center' }}>H. Acumuladas</th>
                    <th style={{ textAlign: 'center' }}>H. Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos para este rango de fechas.</td>
                    </tr>
                  )}
                  {reportData.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '500' }}>{r.name}</td>
                      <td>
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}>
                          {r.role || 'N/A'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{r.shift_start ? `${r.shift_start}-${r.shift_end}` : '-'}</td>
                      <td style={{ fontSize: '12px' }}>{r.saturday_shift_start ? `${r.saturday_shift_start}-${r.saturday_shift_end}` : '-'}</td>
                      <td style={{ fontSize: '12px' }}>{r.sunday_shift_start ? `${r.sunday_shift_start}-${r.sunday_shift_end}` : '-'}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.days_worked}</td>
                      <td style={{ textAlign: 'center', color: r.late_arrivals > 0 ? '#ef4444' : 'inherit', fontWeight: r.late_arrivals > 0 ? 'bold' : 'normal' }}>
                        {r.late_arrivals}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary)' }}>
                        {r.total_hours}h {r.total_mins}m
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: (r.overtime_hours > 0 || r.overtime_mins > 0) ? '#10b981' : 'var(--text-muted)' }}>
                        {r.overtime_hours}h {r.overtime_mins}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Asistencia;
