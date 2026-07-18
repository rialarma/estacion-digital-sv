import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Truck, Plus, Edit2, Trash2, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const Proveedores = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    nit: '',
    nrc: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
    if (!error && data) {
      setSuppliers(data);
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

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();
        
      if (profileError || !profile?.tenant_id) {
        throw new Error("No se encontró el perfil de la empresa.");
      }

      if (editingId) {
        const { error } = await supabase.from('suppliers').update(formData).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers').insert([{ ...formData, tenant_id: profile.tenant_id }]);
        if (error) throw error;
      }
      
      setShowModal(false);
      setFormData({ name: '', nit: '', nrc: '', email: '', phone: '' });
      setEditingId(null);
      fetchSuppliers();
    } catch (error) {
      console.error(error);
      alert("Error al guardar: " + error.message);
    }
  };

  const handleEdit = (supplier) => {
    setFormData({
      name: supplier.name,
      nit: supplier.nit || '',
      nrc: supplier.nrc || '',
      email: supplier.email || '',
      phone: supplier.phone || ''
    });
    setEditingId(supplier.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este proveedor?')) {
      await supabase.from('suppliers').delete().eq('id', id);
      fetchSuppliers();
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Directorio de Proveedores" icon={Truck}>
        <button className="glass-button" onClick={() => {
          setEditingId(null);
          setFormData({ name: '', nit: '', nrc: '', email: '', phone: '' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando proveedores...</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Nombre del Proveedor</th>
                <th>Documentos (NIT / NRC)</th>
                <th>Contacto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay proveedores registrados.</td>
                </tr>
              )}
              {suppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Truck size={18} />
                      </div>
                      {supplier.name}
                    </div>
                  </td>
                  <td>
                    {supplier.nit && <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--text-muted)' }}>NIT:</span> {supplier.nit}</div>}
                    {supplier.nrc && <div style={{ fontSize: '13px' }}><span style={{ color: 'var(--text-muted)' }}>NRC:</span> {supplier.nrc}</div>}
                    {!supplier.nit && !supplier.nrc && <span style={{ color: 'var(--text-muted)' }}>N/A</span>}
                  </td>
                  <td>
                    {supplier.phone && <div>📞 {supplier.phone}</div>}
                    {supplier.email && <div>✉️ {supplier.email}</div>}
                    {!supplier.phone && !supplier.email && <span style={{ color: 'var(--text-muted)' }}>Sin contacto</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(supplier)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(supplier.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
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
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nombre del Proveedor *</label>
                <input required type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>NIT</label>
                  <input type="text" className="glass-input" name="nit" value={formData.nit} onChange={handleInputChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>NRC</label>
                  <input type="text" className="glass-input" name="nrc" value={formData.nrc} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Teléfono</label>
                  <input type="text" className="glass-input" name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Correo Electrónico</label>
                  <input type="email" className="glass-input" name="email" value={formData.email} onChange={handleInputChange} />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="glass-button" style={{ flex: 1, background: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center' }} onClick={() => setShowModal(false)}>
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

export default Proveedores;
