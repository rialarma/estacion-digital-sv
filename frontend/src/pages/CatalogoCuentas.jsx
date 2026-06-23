import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { Plus, Settings, Check, Edit2, Trash2 } from 'lucide-react';

const CatalogoCuentas = () => {
  const { tenantId } = useTenantStore();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Activo',
    nature: 'deudora',
    is_group: false,
    parent_id: ''
  });

  useEffect(() => {
    if (tenantId) fetchAccounts();
  }, [tenantId]);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('code', { ascending: true });
      
    if (!error && data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  const handleInitialize = async () => {
    if (!confirm('¿Deseas cargar el catálogo estándar de El Salvador?')) return;
    
    const { data, error } = await supabase.rpc('seed_default_accounts', { p_tenant_id: tenantId });
    if (error) {
      alert('Error cargando cuentas: ' + error.message);
    } else {
      if (data) {
        alert('Catálogo cargado exitosamente.');
        fetchAccounts();
      } else {
        alert('Ya tienes cuentas registradas.');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) return;

    try {
      if (editingId) {
        await supabase
          .from('accounts')
          .update({ ...formData, parent_id: formData.parent_id || null })
          .eq('id', editingId);
      } else {
        await supabase
          .from('accounts')
          .insert([{ ...formData, tenant_id: tenantId, parent_id: formData.parent_id || null }]);
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      alert("Error al guardar: " + err.message);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ code: '', name: '', type: 'Activo', nature: 'deudora', is_group: false, parent_id: '' });
    setShowModal(true);
  };

  const openEdit = (acc) => {
    setEditingId(acc.id);
    setFormData({
      code: acc.code,
      name: acc.name,
      type: acc.type,
      nature: acc.nature,
      is_group: acc.is_group,
      parent_id: acc.parent_id || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar cuenta? Podría causar errores si tiene partidas asociadas.")) return;
    await supabase.from('accounts').delete().eq('id', id);
    fetchAccounts();
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Catálogo de Cuentas</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          {accounts.length === 0 && !loading && (
            <button className="glass-button" onClick={handleInitialize} style={{ background: '#fbbf24', color: '#000' }}>
              <Settings size={18} /> Cargar Catálogo Base (El Salvador)
            </button>
          )}
          <button className="glass-button" onClick={openNew}>
            <Plus size={18} /> Nueva Cuenta
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando...</div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <p style={{ marginBottom: '16px' }}>No hay cuentas registradas.</p>
            <p>Puedes empezar cargando el catálogo estándar.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre de Cuenta</th>
                  <th>Tipo</th>
                  <th>Naturaleza</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(acc => (
                  <tr key={acc.id}>
                    <td style={{ fontWeight: acc.is_group ? 800 : 500 }}>{acc.code}</td>
                    <td style={{ 
                      paddingLeft: acc.code.length > 1 ? `${(acc.code.length - 1) * 12}px` : '16px',
                      fontWeight: acc.is_group ? 700 : 400
                    }}>
                      {acc.name}
                    </td>
                    <td>{acc.type}</td>
                    <td><span style={{ textTransform: 'capitalize' }}>{acc.nature}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => openEdit(acc)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}><Edit2 size={16}/></button>
                        <button onClick={() => handleDelete(acc.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>{editingId ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-1-1">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Código</label>
                  <input required type="text" className="glass-input" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="Ej: 1105" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Nombre de Cuenta</label>
                  <input required type="text" className="glass-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
              </div>
              <div className="grid-1-1">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tipo</label>
                  <select className="glass-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Activo">Activo</option>
                    <option value="Pasivo">Pasivo</option>
                    <option value="Patrimonio">Patrimonio</option>
                    <option value="Ingreso">Ingreso</option>
                    <option value="Costo">Costo</option>
                    <option value="Gasto">Gasto</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Naturaleza</label>
                  <select className="glass-input" value={formData.nature} onChange={e => setFormData({...formData, nature: e.target.value})}>
                    <option value="deudora">Deudora</option>
                    <option value="acreedora">Acreedora</option>
                  </select>
                </div>
              </div>
              <div className="grid-1-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '28px' }}>
                  <input type="checkbox" id="isGroup" checked={formData.is_group} onChange={e => setFormData({...formData, is_group: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  <label htmlFor="isGroup" style={{ marginBottom: 0, cursor: 'pointer' }}>Es cuenta de Mayor (Agrupadora)</label>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Cuenta Padre (Opcional)</label>
                  <select className="glass-input" value={formData.parent_id} onChange={e => setFormData({...formData, parent_id: e.target.value})}>
                    <option value="">-- Ninguna --</option>
                    {accounts.filter(a => a.is_group && a.id !== editingId).map(a => (
                      <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }} onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }}><Check size={18}/> Guardar Cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogoCuentas;
