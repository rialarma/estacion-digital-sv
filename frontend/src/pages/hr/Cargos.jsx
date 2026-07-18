import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useTenantStore } from '../../store/useTenantStore';
import { Plus, Edit2, Trash2, Briefcase } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

const Cargos = () => {
  const { tenantInfo } = useTenantStore();
  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    department_id: '',
    base_salary: ''
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchData();
    }
  }, [tenantInfo]);

  const fetchData = async () => {
    setLoading(true);
    // Fetch departments for the dropdown
    const { data: deptData } = await supabase
      .from('hr_departments')
      .select('id, name');
    if (deptData) setDepartments(deptData);

    // Fetch positions with their department names
    const { data, error } = await supabase
      .from('hr_positions')
      .select('*, hr_departments(name)')
      .order('name');
      
    if (!error && data) {
      setPositions(data);
    } else if (error) {
      console.error('Error fetching positions:', error);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!tenantInfo?.id) return;
    setSaving(true);
    
    const payload = {
      name: formData.name,
      department_id: formData.department_id || null,
      base_salary: parseFloat(formData.base_salary) || 0
    };

    try {
      if (editingPosition) {
        const { error } = await supabase
          .from('hr_positions')
          .update(payload)
          .eq('id', editingPosition.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hr_positions')
          .insert([{ ...payload, tenant_id: tenantInfo.id }]);
          
        if (error) throw error;
      }
      
      setShowModal(false);
      setEditingPosition(null);
      setFormData({ name: '', department_id: '', base_salary: '' });
      fetchData();
    } catch (error) {
      alert('Error guardando cargo: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cargo?')) {
      try {
        const { error } = await supabase
          .from('hr_positions')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        fetchData();
      } catch (error) {
        alert('Error eliminando: ' + error.message);
      }
    }
  };

  const openEdit = (pos) => {
    setEditingPosition(pos);
    setFormData({
      name: pos.name,
      department_id: pos.department_id || '',
      base_salary: pos.base_salary || ''
    });
    setShowModal(true);
  };

  return (
    <div className="page-full-height" style={{ gap: '24px' }}>
      <PageHeader title="Cargos" icon={Briefcase}>
        <div>
          
          <p className="page-subtitle">Define los cargos o puestos de trabajo y su salario base.</p>
        </div>
        <button className="glass-button" onClick={() => {
          setEditingPosition(null);
          setFormData({ name: '', department_id: '', base_salary: '' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Cargo
        </button>
      </PageHeader>
      
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando cargos...</div>
        ) : (
          <div className="panel-scrollable">
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Cargo</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Departamento</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Salario Base</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Acciones</th>
                </tr>
              </thead>
            <tbody>
              {positions.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay cargos registrados.</td>
                </tr>
              )}
              {positions.map(pos => (
                <tr key={pos.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--primary)' }}>
                        <Briefcase size={18} />
                      </div>
                      {pos.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{pos.hr_departments?.name || '-'}</td>
                  <td>${Number(pos.base_salary).toFixed(2)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="glass-button" 
                        style={{ padding: '6px', minWidth: 'auto' }}
                        title="Editar"
                        onClick={() => openEdit(pos)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="glass-button" 
                        style={{ padding: '6px', minWidth: 'auto', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                        title="Eliminar"
                        onClick={() => handleDelete(pos.id)}
                      >
                        <Trash2 size={16} />
                      </button>
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
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <h2 style={{ marginBottom: '24px' }}>{editingPosition ? 'Editar Cargo' : 'Nuevo Cargo'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Nombre del Cargo *</label>
                <input required type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ej. Vendedor de Tienda" />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label>Departamento</label>
                  <select className="glass-input" name="department_id" value={formData.department_id} onChange={handleInputChange}>
                    <option value="">Selecciona un departamento...</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Salario Base Mensual de Referencia</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>$</span>
                    <input type="number" step="0.01" min="0" className="glass-input" name="base_salary" value={formData.base_salary} onChange={handleInputChange} placeholder="0.00" style={{ paddingLeft: '24px' }} />
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cargos;
