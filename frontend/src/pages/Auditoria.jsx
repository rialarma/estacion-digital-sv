import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import PageHeader from '../components/PageHeader';
import { Shield, Clock, User, FileText, Search } from 'lucide-react';

const Auditoria = () => {
  const { tenantId } = useTenantStore();
  const [logs, setLogs] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users Profile to map UUID to Name
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, role')
        .eq('tenant_id', tenantId);
        
      const uMap = {};
      if (!usersError && usersData) {
        usersData.forEach(u => {
          uMap[u.id] = `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Usuario Desconocido';
        });
        setUsersMap(uMap);
      }

      // 2. Fetch Audit Logs
      // En caso de que la tabla aún no exista, capturamos el error para no romper la app
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (logsError) {
        console.error('Error fetching audit logs (tabla posiblemente no existe):', logsError);
      } else if (logsData) {
        setLogs(logsData);
      }
    } catch (err) {
      console.error('Error en auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    switch (action?.toUpperCase()) {
      case 'CREAR': return 'var(--success)';
      case 'ANULAR': return 'var(--danger)';
      case 'ACTUALIZAR': return 'var(--warning)';
      default: return 'var(--text-main)';
    }
  };

  const filteredLogs = logs.filter(log => {
    const userName = (usersMap[log.user_id] || 'Desconocido').toLowerCase();
    const search = searchTerm.toLowerCase();
    return userName.includes(search) || 
           log.action.toLowerCase().includes(search) ||
           log.entity_type.toLowerCase().includes(search) ||
           (log.details && JSON.stringify(log.details).toLowerCase().includes(search));
  });

  return (
    <div className="fade-in">
      <PageHeader title="Bitácora de Auditoría" icon={Shield}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Buscar usuario o acción..."
            className="glass-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', width: '250px' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Este módulo registra de forma estricta e inmutable las acciones críticas del sistema, como la creación y anulación de ventas o compras.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando bitácora...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No hay registros de auditoría o la tabla aún no ha sido creada en la base de datos.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th><Clock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Fecha y Hora</th>
                  <th><User size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Usuario</th>
                  <th>Acción</th>
                  <th>Módulo</th>
                  <th><FileText size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Detalles</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: '600' }}>
                      {usersMap[log.user_id] || 'ID: ' + log.user_id.substring(0,8)}
                    </td>
                    <td style={{ fontWeight: 'bold', color: getActionColor(log.action) }}>
                      {log.action}
                    </td>
                    <td>{log.entity_type}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {log.details ? (
                        typeof log.details === 'string' ? log.details : JSON.stringify(log.details)
                      ) : (
                        `Ref: ${log.entity_id.substring(0,8)}`
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auditoria;
