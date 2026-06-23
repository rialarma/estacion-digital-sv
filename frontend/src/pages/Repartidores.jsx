import React, { useState, useEffect } from 'react';
import { Truck, Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';

const Repartidores = () => {
  const [drivers, setDrivers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', plate_number: '' });
  const [loading, setLoading] = useState(true);
  const { tenantInfo } = useTenantStore();

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('name', { ascending: true });
    
    if (!error && data) {
      setDrivers(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (editingId) {
      const { error } = await supabase
        .from('drivers')
        .update(formData)
        .eq('id', editingId);
      if (!error) {
        setShowModal(false);
        fetchDrivers();
      } else {
        alert("Error actualizando: " + error.message);
      }
    } else {
      const { error } = await supabase
        .from('drivers')
        .insert([{ ...formData, tenant_id: tenantInfo.id }]);
      if (!error) {
        setShowModal(false);
        fetchDrivers();
      } else {
        alert("Error creando: " + error.message);
      }
    }
  };

  const handleEdit = (driver) => {
    setFormData({ name: driver.name, phone: driver.phone || '', plate_number: driver.plate_number || '' });
    setEditingId(driver.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este repartidor?')) {
      await supabase.from('drivers').delete().eq('id', id);
      fetchDrivers();
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ name: '', phone: '', plate_number: '' });
    setShowModal(true);
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    (d.plate_number && d.plate_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Repartidores y Flota</h1>
        <button className="glass-button" onClick={openNewModal}>
          <Plus size={20} /> Nuevo Repartidor
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <div className="search-bar" style={{ marginBottom: '20px', maxWidth: '400px' }}>
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            className="search-input" 
            placeholder="Buscar por nombre o placa..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando repartidores...</div>
        ) : filteredDrivers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No se encontraron repartidores. Añade uno nuevo.
          </div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Nombre del Repartidor / Vehículo</th>
                <th>Número de Placa</th>
                <th>Teléfono</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map(driver => (
                <tr key={driver.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
                        <Truck size={18} />
                      </div>
                      {driver.name}
                    </div>
                  </td>
                  <td>{driver.plate_number || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                  <td>{driver.phone || <span style={{ color: 'var(--text-muted)' }}>N/A</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleEdit(driver)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(driver.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
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
          <div className="modal-content glass-panel" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>{editingId ? 'Editar Repartidor' : 'Nuevo Repartidor'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nombre del Repartidor o Descripción del Vehículo *</label>
                <input required type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ej. Juan Pérez - Camión Isuzu" />
              </div>
              <div className="form-group">
                <label>Número de Placa</label>
                <input type="text" className="glass-input" name="plate_number" value={formData.plate_number} onChange={handleInputChange} placeholder="P 123-456" />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input type="text" className="glass-input" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Ej. 7777-7777" />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
                <button type="button" className="glass-button" style={{ background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button">
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

export default Repartidores;
