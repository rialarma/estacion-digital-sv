import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { useTenantStore } from '../../store/useTenantStore';
import { Plus, Edit2, Trash2, Building2, Building } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

const Departamentos = () => {
  const { tenantInfo } = useTenantStore();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchDepartments();
    }
  }, [tenantInfo]);

  const fetchDepartments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hr_departments')
      .select('*')
      .order('name');
      
    if (!error && data) {
      setDepartments(data);
    } else if (error) {
      console.error('Error fetching departments:', error);
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
    
    try {
      if (editingDept) {
        const { error } = await supabase
          .from('hr_departments')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', editingDept.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hr_departments')
          .insert([{
            tenant_id: tenantInfo.id,
            name: formData.name,
            description: formData.description
          }]);
          
        if (error) throw error;
      }
      
      setShowModal(false);
      setEditingDept(null);
      setFormData({ name: '', description: '' });
      fetchDepartments();
    } catch (error) {
      alert('Error guardando departamento: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este departamento? Los cargos asociados perderán esta referencia.')) {
      try {
        const { error } = await supabase
          .from('hr_departments')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        fetchDepartments();
      } catch (error) {
        alert('Error eliminando: ' + error.message);
      }
    }
  };

  const openEdit = (dept) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description || ''
    });
    setShowModal(true);
  };

  return (
    <div className="page-full-height" style={{ gap: '24px' }}>
      
      {/* Header */}
      <PageHeader title="Departamentos" icon={Building}>
        <div>
          
          <p className="page-subtitle">Gestiona las áreas o departamentos de la empresa.</p>
        </div>
        <button className="glass-button" onClick={() => {
          setEditingDept(null);
          setFormData({ name: '', description: '' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Departamento
        </button>
      </PageHeader>
      
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando departamentos...</div>
        ) : (
          <div className="panel-scrollable">
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Nombre del Departamento</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Descripción</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Acciones</th>
                </tr>
              </thead>
            <tbody>
              {departments.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay departamentos registrados.</td>
                </tr>
              )}
              {departments.map(dept => (
                <tr key={dept.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '8px', color: 'var(--primary)' }}>
                        <Building2 size={18} />
                      </div>
                      {dept.name}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{dept.description || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="glass-button" 
                        style={{ padding: '6px', minWidth: 'auto' }}
                        title="Editar"
                        onClick={() => openEdit(dept)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="glass-button" 
                        style={{ padding: '6px', minWidth: 'auto', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                        title="Eliminar"
                        onClick={() => handleDelete(dept.id)}
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
            <h2 style={{ marginBottom: '24px' }}>{editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Nombre del Departamento *</label>
                <input required type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ej. Ventas, Bodega, Administración" />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Descripción (Opcional)</label>
                <textarea className="glass-input" name="description" value={formData.description} onChange={handleInputChange} rows="3" placeholder="Breve descripción del área"></textarea>
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

export default Departamentos;
