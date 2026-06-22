import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    email: '',
    phone: '',
    document_type: 'NIT',
    document_number: '',
    address: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('clients').select('*').order('name', { ascending: true });
    if (!error && data) {
      setClients(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', userData.user.id);
        
      if (profileError) throw profileError;
      if (!profiles || profiles.length === 0) {
        throw new Error("No se encontró el perfil de la empresa.");
      }

      const profile = profiles[0];

      if (editingId) {
        const { error } = await supabase.from('clients').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert([{ ...formData, tenant_id: profile.tenant_id }]);
        if (error) throw error;
      }
      
      setShowModal(false);
      setFormData({ name: '', business_name: '', email: '', phone: '', document_type: 'NIT', document_number: '', address: '' });
      setEditingId(null);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert("Error al guardar: " + error.message);
    }
  };

  const handleEdit = (client) => {
    setFormData({
      name: client.name,
      business_name: client.business_name || '',
      email: client.email || '',
      phone: client.phone || '',
      document_type: client.document_type || 'NIT',
      document_number: client.document_number || '',
      address: client.address || ''
    });
    setEditingId(client.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      await supabase.from('clients').delete().eq('id', id);
      fetchClients();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Directorio de Clientes</h1>
        <button className="glass-button" onClick={() => {
          setEditingId(null);
          setFormData({ name: '', business_name: '', email: '', phone: '', document_type: 'NIT', document_number: '', address: '' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando clientes...</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Nombre del Cliente</th>
                <th>Razón Social</th>
                <th>Documento</th>
                <th>Contacto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay clientes registrados.</td>
                </tr>
              )}
              {clients.map(client => (
                <tr key={client.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Users size={18} />
                      </div>
                      {client.name}
                    </div>
                  </td>
                  <td>{client.business_name || <span style={{ color: 'var(--text-muted)' }}>-</span>}</td>
                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{client.document_type}</span><br/>
                    {client.document_number || 'N/A'}
                  </td>
                  <td>
                    {client.phone && <div>📞 {client.phone}</div>}
                    {client.email && <div>✉️ {client.email}</div>}
                    {!client.phone && !client.email && <span style={{ color: 'var(--text-muted)' }}>Sin contacto</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(client)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(client.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '24px' }}>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Nombre del Cliente *</label>
                  <input required type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Razón Social</label>
                  <input type="text" className="glass-input" name="business_name" value={formData.business_name} onChange={handleInputChange} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Tipo Doc.</label>
                  <select className="glass-input" name="document_type" value={formData.document_type} onChange={handleInputChange}>
                    <option value="NIT">NIT</option>
                    <option value="DUI">DUI</option>
                    <option value="NRC">NRC</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Número de Documento</label>
                  <input type="text" className="glass-input" name="document_number" value={formData.document_number} onChange={handleInputChange} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="text" className="glass-input" name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" className="glass-input" name="email" value={formData.email} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input type="text" className="glass-input" name="address" value={formData.address} onChange={handleInputChange} />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
