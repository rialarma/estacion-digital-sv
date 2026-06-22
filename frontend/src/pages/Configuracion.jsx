import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { Building2, Receipt, MapPin, Users, Palette, Save, Plus, Edit2, Trash2 } from 'lucide-react';

const TabEmpresa = ({ tenantInfo, onSave }) => {
  const [formData, setFormData] = useState({
    name: tenantInfo?.name || '',
    nit: tenantInfo?.nit || '',
    nrc: tenantInfo?.nrc || '',
    activity_desc: tenantInfo?.activity_desc || '',
    logo_url: tenantInfo?.logo_url || '',
    receipt_message: tenantInfo?.receipt_message || ''
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '20px' }}>Datos de la Empresa</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label>Nombre Comercial / Razón Social</label>
          <input className="glass-input" name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Giro o Actividad Económica</label>
          <input className="glass-input" name="activity_desc" value={formData.activity_desc} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>NIT</label>
          <input className="glass-input" name="nit" value={formData.nit} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>NRC</label>
          <input className="glass-input" name="nrc" value={formData.nrc} onChange={handleChange} />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>URL del Logo</label>
          <input className="glass-input" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://ejemplo.com/logo.png" />
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Mensaje al pie del ticket/factura</label>
          <input className="glass-input" name="receipt_message" value={formData.receipt_message} onChange={handleChange} placeholder="¡Gracias por su compra!" />
        </div>
      </div>
      <button className="glass-button" style={{ marginTop: '16px' }} onClick={() => onSave(formData)}>
        <Save size={18} /> Guardar Datos
      </button>
    </div>
  );
};

const TabFacturacion = ({ tenantInfo, onSave }) => {
  const [formData, setFormData] = useState({
    tax_iva: tenantInfo?.tax_iva || 13.00,
    tax_retention: tenantInfo?.tax_retention || 1.00
  });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '20px' }}>Parámetros de Facturación</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label>Porcentaje de IVA (%)</label>
          <input type="number" step="0.01" className="glass-input" name="tax_iva" value={formData.tax_iva} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label>Porcentaje de Retención (%)</label>
          <input type="number" step="0.01" className="glass-input" name="tax_retention" value={formData.tax_retention} onChange={handleChange} />
        </div>
      </div>
      <button className="glass-button" style={{ marginTop: '16px' }} onClick={() => onSave({
        tax_iva: parseFloat(formData.tax_iva),
        tax_retention: parseFloat(formData.tax_retention)
      })}>
        <Save size={18} /> Guardar Impuestos
      </button>
    </div>
  );
};

const TabSucursales = ({ tenantId }) => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', establishment_code: '', point_of_sale_code: '' });

  useEffect(() => { fetchBranches(); }, []);

  const fetchBranches = async () => {
    setLoading(true);
    const { data } = await supabase.from('branches').select('*').order('created_at');
    if (data) setBranches(data);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from('branches').update(formData).eq('id', editingId);
    } else {
      await supabase.from('branches').insert([{ ...formData, tenant_id: tenantId }]);
    }
    setShowModal(false);
    fetchBranches();
  };

  const handleEdit = (b) => {
    setFormData({ name: b.name, address: b.address || '', establishment_code: b.establishment_code || '', point_of_sale_code: b.point_of_sale_code || '' });
    setEditingId(b.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar esta sucursal?')) {
      await supabase.from('branches').delete().eq('id', id);
      fetchBranches();
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h3>Sucursales</h3>
        <button className="glass-button" style={{ padding: '6px 12px', fontSize: '14px' }} onClick={() => {
          setEditingId(null); setFormData({ name: '', address: '', establishment_code: '', point_of_sale_code: '' }); setShowModal(true);
        }}>
          <Plus size={16} /> Añadir Sucursal
        </button>
      </div>
      
      {loading ? <p>Cargando...</p> : (
        <table className="glass-table">
          <thead>
            <tr><th>Nombre</th><th>Dirección</th><th>Cód. Establecimiento</th><th>Punto Venta</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {branches.map(b => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td>{b.address || '-'}</td>
                <td>{b.establishment_code || '-'}</td>
                <td>{b.point_of_sale_code || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEdit(b)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(b.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
            <form onSubmit={handleSave} style={{ marginTop: '16px' }}>
              <div className="form-group"><label>Nombre</label><input required className="glass-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div className="form-group"><label>Dirección</label><input className="glass-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group"><label>Cód. Establecimiento MH</label><input className="glass-input" value={formData.establishment_code} onChange={e => setFormData({...formData, establishment_code: e.target.value})} /></div>
                <div className="form-group"><label>Cód. Punto Venta MH</label><input className="glass-input" value={formData.point_of_sale_code} onChange={e => setFormData({...formData, point_of_sale_code: e.target.value})} /></div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="glass-button" style={{ background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="glass-button">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const TabUsuarios = ({ tenantInfo, onRegenerateCode }) => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: bData } = await supabase.from('branches').select('id, name');
      if (bData) setBranches(bData);
      
      const { data: uData } = await supabase.from('user_profiles').select('*, branches(name)');
      if (uData) setUsers(uData);
      
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleRoleChange = async (userId, newRole, newBranch) => {
    try {
      const { error } = await supabase.rpc('update_user_role', {
        p_user_id: userId,
        p_new_role: newRole,
        p_new_branch: newBranch
      });
      if (error) throw error;
      alert('Rol actualizado exitosamente');
      // Refresh
      const { data } = await supabase.from('user_profiles').select('*, branches(name)');
      if (data) setUsers(data);
    } catch (err) {
      alert('Error actualizando: ' + err.message);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3>Usuarios Registrados</h3>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px dashed var(--primary)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Código de Invitación</div>
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px', color: 'var(--primary)' }}>{tenantInfo?.invite_code || '------'}</div>
          </div>
          <button className="glass-button" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={onRegenerateCode}>Regenerar</button>
        </div>
      </div>
      
      {loading ? <p>Cargando...</p> : (
        <table className="glass-table">
          <thead>
            <tr><th>Nombre</th><th>Rol</th><th>Sucursal</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.first_name} {u.last_name}</td>
                <td>
                  <select 
                    className="glass-input" 
                    style={{ padding: '4px', fontSize: '13px' }}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value, u.branch_id)}
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="CAJERO">Cajero</option>
                    <option value="BODEGUERO">Bodeguero</option>
                  </select>
                </td>
                <td>
                  <select 
                    className="glass-input" 
                    style={{ padding: '4px', fontSize: '13px' }}
                    value={u.branch_id || ''}
                    onChange={(e) => handleRoleChange(u.id, u.role, e.target.value || null)}
                  >
                    <option value="">Todas (Sin sucursal)</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        * Pasa el Código de Invitación a tus empleados para que se unan a la empresa al registrarse en el sistema.
      </p>
    </div>
  );
};

const TabApariencia = ({ tenantInfo, onSave }) => {
  return (
    <div className="glass-panel" style={{ padding: '24px' }}>
      <h3 style={{ marginBottom: '20px' }}>Preferencia Visual</h3>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div 
          onClick={() => onSave({ theme: 'dark' })}
          style={{ 
            padding: '20px', borderRadius: '12px', cursor: 'pointer', flex: 1, textAlign: 'center',
            border: tenantInfo?.theme !== 'light' ? '2px solid var(--primary)' : '1px solid var(--border-color)',
            background: '#0f172a', color: '#f8fafc'
          }}
        >
          <h4>Modo Oscuro</h4>
        </div>
        <div 
          onClick={() => onSave({ theme: 'light' })}
          style={{ 
            padding: '20px', borderRadius: '12px', cursor: 'pointer', flex: 1, textAlign: 'center',
            border: tenantInfo?.theme === 'light' ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.1)',
            background: '#f8fafc', color: '#0f172a'
          }}
        >
          <h4>Modo Claro</h4>
        </div>
      </div>
    </div>
  );
};

const Configuracion = () => {
  const { tenantId, tenantInfo, updateTenantInfo } = useTenantStore();
  const [activeTab, setActiveTab] = useState('empresa');
  const [saving, setSaving] = useState(false);

  const handleUpdateTenant = async (updates) => {
    setSaving(true);
    const { error } = await supabase.from('tenants').update(updates).eq('id', tenantId);
    if (!error) {
      updateTenantInfo(updates);
      alert('Configuración actualizada.');
    } else {
      alert('Error: ' + error.message);
    }
    setSaving(false);
  };

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: <Building2 size={18} /> },
    { id: 'facturacion', label: 'Facturación', icon: <Receipt size={18} /> },
    { id: 'sucursales', label: 'Sucursales', icon: <MapPin size={18} /> },
    { id: 'usuarios', label: 'Usuarios', icon: <Users size={18} /> },
    { id: 'apariencia', label: 'Apariencia', icon: <Palette size={18} /> }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Configuración</h1>
      </div>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Sidebar Menu inside Config */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, textAlign: 'left',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div style={{ flex: 1 }}>
          {saving && <p style={{ color: 'var(--primary)', marginBottom: '16px' }}>Guardando...</p>}
          {activeTab === 'empresa' && <TabEmpresa tenantInfo={tenantInfo} onSave={handleUpdateTenant} />}
          {activeTab === 'facturacion' && <TabFacturacion tenantInfo={tenantInfo} onSave={handleUpdateTenant} />}
          {activeTab === 'sucursales' && <TabSucursales tenantId={tenantId} />}
          {activeTab === 'usuarios' && <TabUsuarios tenantInfo={tenantInfo} onRegenerateCode={async () => {
            if(window.confirm('¿Seguro que quieres invalidar el código actual? Los que intenten usarlo ya no podrán unirse.')) {
              const { data, error } = await supabase.rpc('regenerate_invite_code');
              if(!error && data) updateTenantInfo({ invite_code: data });
            }
          }} />}
          {activeTab === 'apariencia' && <TabApariencia tenantInfo={tenantInfo} onSave={handleUpdateTenant} />}
        </div>
      </div>
    </div>
  );
};

export default Configuracion;
