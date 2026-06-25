import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { createClient } from '@supabase/supabase-js';
import { UserCheck, Plus, Edit2, Shield, Mail, Key } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';
import { useAuth } from '../hooks/useAuth';

const Empleados = () => {
  const { tenantInfo } = useTenantStore();
  const { user } = useAuth();
  
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [resettingPasswordEmployee, setResettingPasswordEmployee] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'VENDEDOR'
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data: bData } = await supabase.from('branches').select('id, name');
    if (bData) setBranches(bData);
    
    // Como RLS (Tenant Isolation) está activo, esto solo trae a los del mismo tenant
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, branches(name)')
      .order('first_name', { ascending: true });
      
    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole, newBranch) => {
    try {
      const { error } = await supabase.rpc('update_user_role', {
        p_user_id: userId,
        p_new_role: newRole,
        p_new_branch: newBranch
      });
      if (error) throw error;
      alert('Datos actualizados exitosamente');
      fetchEmployees();
    } catch (err) {
      alert('Error actualizando: ' + err.message);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_update_user_profile', {
        p_user_id: editingEmployee.id,
        p_first_name: editingEmployee.first_name,
        p_last_name: editingEmployee.last_name,
        p_pin: editingEmployee.pin || null,
        p_shift_start: editingEmployee.shift_start || null,
        p_shift_end: editingEmployee.shift_end || null,
        p_saturday_shift_start: editingEmployee.saturday_shift_start || null,
        p_saturday_shift_end: editingEmployee.saturday_shift_end || null,
        p_sunday_shift_start: editingEmployee.sunday_shift_start || null,
        p_sunday_shift_end: editingEmployee.sunday_shift_end || null
      });
      if (error) throw error;
      
      alert('Perfil actualizado exitosamente.');
      setEditingEmployee(null);
      fetchEmployees();
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.rpc('admin_reset_user_password', {
        p_user_id: resettingPasswordEmployee.id,
        p_new_password: newPassword
      });
      if (error) throw error;
      alert('Contraseña actualizada exitosamente.');
      setResettingPasswordEmployee(null);
      setNewPassword('');
    } catch (err) {
      alert('Error al resetear contraseña: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // 1. Crear un cliente Supabase secundario para no cerrar la sesión del Admin
      const tempClient = createClient(
        supabaseUrl, 
        supabaseAnonKey,
        { auth: { persistSession: false } }
      );

      // 2. Crear el usuario en auth.users
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      const newUserId = authData.user?.id;
      if (!newUserId) throw new Error("No se pudo obtener el ID del nuevo usuario.");

      // Generar nombre de usuario (ej. edsvricara)
      const sanitize = str => (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 3);
      const prefix = (tenantInfo?.tenant_prefix || sanitize(tenantInfo?.name || 'emp')).toLowerCase().replace(/[^a-z0-9]/g, '');
      const fName = sanitize(formData.firstName);
      const lName = sanitize(formData.lastName);
      const generatedUsername = `${prefix}${fName}${lName}`;

      // 3. Crear el perfil del usuario usando el RPC
      const { error: rpcError } = await supabase.rpc('admin_create_user_profile', {
        p_user_id: newUserId,
        p_role: formData.role,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_username: generatedUsername
      });

      if (rpcError) throw rpcError;

      alert('¡Empleado creado exitosamente!');
      setShowModal(false);
      setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'VENDEDOR' });
      fetchEmployees();
      
    } catch (error) {
      console.error(error);
      alert("Error al crear empleado: " + (error.message || error.error_description || "Revisa si el correo ya existe."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <h1 className="page-title">Directorio de Empleados</h1>
          <p className="page-subtitle">Gestiona a los usuarios que pueden acceder y trabajar en tu sistema.</p>
        </div>
        <button className="glass-button" onClick={() => {
          setFormData({ firstName: '', lastName: '', email: '', password: '', role: 'VENDEDOR' });
          setShowModal(true);
        }}>
          <Plus size={18} /> Nuevo Empleado
        </button>
      </div>
      
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Auto-Registro con Código</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>También puedes pasar este código a tus empleados para que se unan a la empresa al crear su propia cuenta.</p>
        </div>
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '12px 16px', borderRadius: '8px', border: '1px dashed var(--primary)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Código de Invitación</div>
            <div style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '2px', color: 'var(--primary)' }}>{tenantInfo?.invite_code || '------'}</div>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando empleados...</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>Nombre del Empleado</th>
                <th>Usuario</th>
                <th>Rol en el Sistema</th>
                <th>Sucursal Asignada</th>
                <th>Fecha de Registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay empleados registrados.</td>
                </tr>
              )}
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
                        <UserCheck size={18} />
                      </div>
                      {emp.first_name} {emp.last_name}
                      {emp.id === user.id && <span style={{ fontSize: '11px', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '2px 6px', borderRadius: '10px', marginLeft: '8px' }}>Tú</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
                      {emp.username || '-'}
                    </span>
                  </td>
                  <td>
                    <select 
                      className="glass-input" 
                      style={{ padding: '4px', fontSize: '13px', minWidth: '140px' }}
                      value={emp.role}
                      onChange={(e) => handleRoleChange(emp.id, e.target.value, emp.branch_id)}
                      disabled={emp.id === user.id}
                    >
                      <option value="ADMIN">Administrador</option>
                      <option value="GERENTE">Gerente</option>
                      <option value="CAJERO">Cajero</option>
                      <option value="BODEGUERO">Bodeguero</option>
                      <option value="VENDEDOR">Vendedor</option>
                    </select>
                  </td>
                  <td>
                    <select 
                      className="glass-input" 
                      style={{ padding: '4px', fontSize: '13px', minWidth: '160px' }}
                      value={emp.branch_id || ''}
                      onChange={(e) => handleRoleChange(emp.id, emp.role, e.target.value || null)}
                    >
                      <option value="">Todas (Sin sucursal)</option>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(emp.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="glass-button" 
                        style={{ padding: '6px', minWidth: 'auto' }}
                        title="Editar Nombre"
                        onClick={() => setEditingEmployee(emp)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="glass-button" 
                        style={{ padding: '6px', minWidth: 'auto', background: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308' }}
                        title="Resetear Contraseña"
                        onClick={() => setResettingPasswordEmployee(emp)}
                      >
                        <Key size={16} />
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
            <h2 style={{ marginBottom: '8px' }}>Registrar Nuevo Empleado</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Importante: Para que el empleado pueda ingresar inmediatamente, debes tener desactivada la opción "Confirm Email" en Supabase.
            </p>
            <form onSubmit={handleSave}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input required type="text" className="glass-input" name="firstName" value={formData.firstName} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input required type="text" className="glass-input" name="lastName" value={formData.lastName} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Correo Electrónico (Para Iniciar Sesión) *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input required type="email" className="glass-input" name="email" value={formData.email} onChange={handleInputChange} style={{ paddingLeft: '38px' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Contraseña *</label>
                  <input required type="password" minLength={6} className="glass-input" name="password" value={formData.password} onChange={handleInputChange} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mínimo 6 caracteres.</span>
                </div>

                <div className="form-group">
                  <label>Rol en el Sistema *</label>
                  <select required className="glass-input" name="role" value={formData.role} onChange={handleInputChange}>
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="CAJERO">Cajero</option>
                    <option value="BODEGUERO">Bodeguero</option>
                    <option value="GERENTE">Gerente</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Creando Usuario...' : 'Crear Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Editar Empleado */}
      {editingEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '24px' }}>Editar Empleado</h2>
            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Nombre</label>
                  <input required type="text" className="glass-input" value={editingEmployee.first_name} onChange={e => setEditingEmployee({...editingEmployee, first_name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Apellido</label>
                  <input required type="text" className="glass-input" value={editingEmployee.last_name} onChange={e => setEditingEmployee({...editingEmployee, last_name: e.target.value})} />
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>PIN Kiosko (Opcional)</label>
                  <input type="text" maxLength={4} placeholder="Ej. 1234" className="glass-input" value={editingEmployee.pin || ''} onChange={e => setEditingEmployee({...editingEmployee, pin: e.target.value})} />
                </div>
              </div>

              <div style={{ marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>Horarios (Dejar en blanco si no aplica)</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div className="form-group">
                  <label>Lunes-Viernes: Entrada</label>
                  <input type="time" className="glass-input" value={editingEmployee.shift_start || ''} onChange={e => setEditingEmployee({...editingEmployee, shift_start: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Lunes-Viernes: Salida</label>
                  <input type="time" className="glass-input" value={editingEmployee.shift_end || ''} onChange={e => setEditingEmployee({...editingEmployee, shift_end: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div className="form-group">
                  <label>Sábado: Entrada</label>
                  <input type="time" className="glass-input" value={editingEmployee.saturday_shift_start || ''} onChange={e => setEditingEmployee({...editingEmployee, saturday_shift_start: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Sábado: Salida</label>
                  <input type="time" className="glass-input" value={editingEmployee.saturday_shift_end || ''} onChange={e => setEditingEmployee({...editingEmployee, saturday_shift_end: e.target.value})} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                <div className="form-group">
                  <label>Domingo: Entrada</label>
                  <input type="time" className="glass-input" value={editingEmployee.sunday_shift_start || ''} onChange={e => setEditingEmployee({...editingEmployee, sunday_shift_start: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Domingo: Salida</label>
                  <input type="time" className="glass-input" value={editingEmployee.sunday_shift_end || ''} onChange={e => setEditingEmployee({...editingEmployee, sunday_shift_end: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setEditingEmployee(null)} disabled={saving}>Cancelar</button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Resetear Clave */}
      {resettingPasswordEmployee && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '8px' }}>Restablecer Contraseña</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Estás a punto de forzar el cambio de contraseña para <strong>{resettingPasswordEmployee.first_name} {resettingPasswordEmployee.last_name}</strong>.
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Nueva Contraseña Temporal</label>
                <input required type="text" minLength={6} className="glass-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Escribe la nueva contraseña" />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => { setResettingPasswordEmployee(null); setNewPassword(''); }} disabled={saving}>Cancelar</button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center', background: 'rgba(234, 179, 8, 0.1)', borderColor: '#eab308', color: '#eab308' }} disabled={saving}>{saving ? 'Procesando...' : 'Cambiar Contraseña'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empleados;
