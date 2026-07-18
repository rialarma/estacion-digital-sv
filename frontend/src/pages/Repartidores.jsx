import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import PageHeader from '../components/PageHeader';

const Repartidores = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const { tenantId } = useTenantStore();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    plate_number: ''
  });

  useEffect(() => {
    if (tenantId) {
      fetchDrivers();
    }
  }, [tenantId]);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
      
    if (!error && data) {
      setDrivers(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', plate_number: '' });
    setEditingDriver(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name || '',
      phone: driver.phone || '',
      plate_number: driver.plate_number || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return;
    setSaving(true);

    try {
      if (editingDriver) {
        const { error } = await supabase
          .from('drivers')
          .update({
            name: formData.name,
            phone: formData.phone || null,
            plate_number: formData.plate_number || null
          })
          .eq('id', editingDriver.id)
          .eq('tenant_id', tenantId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('drivers')
          .insert([{
            tenant_id: tenantId,
            name: formData.name,
            phone: formData.phone || null,
            plate_number: formData.plate_number || null
          }]);

        if (error) throw error;
      }
      
      setShowModal(false);
      resetForm();
      fetchDrivers();
    } catch (err) {
      console.error(err);
      alert('Error guardando repartidor: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${name}? Esto podría afectar el historial si tiene entregas asignadas (quedaría sin chofer referenciado).`)) return;

    try {
      const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDrivers();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.plate_number && d.plate_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-container fade-in">
      <PageHeader title="Gestión de Repartidores" icon={Truck}>
        <div className="header-title">
          
          <div>
            
            <p style={{ color: 'var(--text-muted)' }}>Administra tu personal de entregas y logística.</p>
          </div>
        </div>
        <button className="glass-button" onClick={openNewModal}>
          
          Nuevo Repartidor
        </button>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, margin: 0 }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o placa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando repartidores...</div>
        ) : (
          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Nombre del Repartidor</th>
                  <th>Teléfono</th>
                  <th>Placa / Vehículo</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.length > 0 ? (
                  filteredDrivers.map(driver => (
                    <tr key={driver.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '40px', height: '40px', 
                            borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)'
                          }}>
                            {driver.name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{driver.name}</strong>
                        </div>
                      </td>
                      <td>{driver.phone || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                      <td>
                        {driver.plate_number ? (
                          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            {driver.plate_number}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="glass-button" 
                            style={{ padding: '8px' }} 
                            title="Editar"
                            onClick={() => openEditModal(driver)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="glass-button" 
                            style={{ padding: '8px', color: '#ef4444' }} 
                            title="Eliminar"
                            onClick={() => handleDelete(driver.id, driver.name)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No se encontraron repartidores registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Truck size={24} color="var(--primary)" />
                {editingDriver ? 'Editar Repartidor' : 'Nuevo Repartidor'}
              </h2>
              <button className="glass-button" style={{ padding: '8px' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Nombre Completo *</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  name="name" 
                  required
                  value={formData.name} 
                  onChange={handleInputChange} 
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Teléfono de Contacto</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                  placeholder="Ej. 7000-0000"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Número de Placa (Vehículo)</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  name="plate_number" 
                  value={formData.plate_number} 
                  onChange={handleInputChange} 
                  placeholder="Ej. P-123456"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Guardando...' : (editingDriver ? 'Guardar Cambios' : 'Registrar Repartidor')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Repartidores;
