import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { UserCheck, Plus, Edit2, Trash2 } from 'lucide-react';

const Vendedores = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('sellers').select('*').order('name', { ascending: true });
    if (!error && data) {
      setSellers(data);
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
        const { error } = await supabase.from('sellers').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sellers').insert([{ ...formData, tenant_id: profile.tenant_id }]);
        if (error) throw error;
      }
      
      setShowModal(false);
      setFormData({ name: '', phone: '', email: '' });
      setEditingId(null);
      fetchSellers();
    } catch (error) {
      console.error(error);
      alert("Error al guardar: " + error.message);
    }
  };

  const handleEdit = (seller) => {
    setFormData({
      name: seller.name,
      phone: seller.phone || '',
      email: seller.email || ''
    });
    setEditingId(seller.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este vendedor?')) {
      await supabase.from('sellers').delete().eq('id', id);
      fetchSellers();
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Directorio de Vendedores</h1>
        <button className="glass-button" onClick={() => {
          setEditingId(null);
          setFormData({ name: '', phone: '', email: '' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Vendedor
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando vendedores...</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Nombre del Vendedor</th>
                <th>Contacto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sellers.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay vendedores registrados.</td>
                </tr>
              )}
              {sellers.map(seller => (
                <tr key={seller.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
                        <UserCheck size={18} />
                      </div>
                      {seller.name}
                    </div>
                  </td>
                  <td>
                    {seller.phone && <div>📞 {seller.phone}</div>}
                    {seller.email && <div>✉️ {seller.email}</div>}
                    {!seller.phone && !seller.email && <span style={{ color: 'var(--text-muted)' }}>Sin contacto</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(seller)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(seller.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
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
            <h2 style={{ marginBottom: '24px' }}>{editingId ? 'Editar Vendedor' : 'Nuevo Vendedor'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nombre del Vendedor *</label>
                <input required type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} />
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

export default Vendedores;
