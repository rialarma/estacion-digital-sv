import React, { useState, useEffect } from 'react';
import { Users, Search, Plus, Edit2, Shield, X, Clock, MapPin, Activity } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { createClient } from '@supabase/supabase-js';
import { useTenantStore } from '../store/useTenantStore';
import { useAuth } from '../hooks/useAuth';
import PageHeader from '../components/PageHeader';

const Usuarios = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistoryUser, setSelectedHistoryUser] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const { tenantId, tenantInfo } = useTenantStore();
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'VENDEDOR',
    pin: ''
  });

  useEffect(() => {
    if (tenantId) {
      fetchUsers();
    }
  }, [tenantId]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('first_name');
      
    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({ first_name: '', last_name: '', email: '', password: '', role: 'VENDEDOR', pin: '' });
    setEditingUser(null);
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openHistoryModal = async (u) => {
    setSelectedHistoryUser(u);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('user_sessions_log')
      .select('*')
      .eq('user_id', u.id)
      .order('login_time', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setSessionHistory(data);
    }
    setLoadingHistory(false);
  };

  const openEditModal = (userProfile) => {
    setEditingUser(userProfile);
    setFormData({
      first_name: userProfile.first_name || '',
      last_name: userProfile.last_name || '',
      email: '', // Email cannot be edited easily from client
      password: '', // Password cannot be edited here
      role: userProfile.role || 'VENDEDOR',
      pin: userProfile.pin || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) return;
    setSaving(true);

    try {
      if (editingUser) {
        const { error: rpcError } = await supabase.rpc('admin_update_user_profile_v2', {
          p_user_id: editingUser.id,
          p_role: formData.role,
          p_first_name: formData.first_name,
          p_last_name: formData.last_name,
          p_pin: formData.pin || null
        });

        if (rpcError) throw rpcError;
      } else {
        // Crear nuevo usuario usando cliente temporal para no perder la sesión
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        const createdUserId = authData.user?.id;
        if (!createdUserId) throw new Error("No se pudo obtener el ID del nuevo usuario.");

        const sanitize = str => (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 3);
        const prefix = (tenantInfo?.tenant_prefix || sanitize(tenantInfo?.name || 'emp')).toLowerCase().replace(/[^a-z0-9]/g, '');
        const fName = sanitize(formData.first_name);
        const lName = sanitize(formData.last_name);
        const generatedUsername = `${prefix}${fName}${lName}`;

        const { error: rpcError } = await supabase.rpc('admin_create_user_profile_v2', {
          p_user_id: createdUserId,
          p_role: formData.role,
          p_first_name: formData.first_name,
          p_last_name: formData.last_name,
          p_username: generatedUsername,
          p_pin: formData.pin || null
        });

        if (rpcError) throw rpcError;

        if (formData.role === 'REPARTIDOR') {
          const driverName = `${formData.first_name} ${formData.last_name}`;
          const { data: existingDriver } = await supabase.from('drivers').select('id').eq('name', driverName).eq('tenant_id', tenantId).maybeSingle();
          if (!existingDriver) {
            await supabase.from('drivers').insert({
              name: driverName,
              tenant_id: tenantId
            });
          }
        }
      }
      
      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Error guardando usuario: ' + (err.message || err.error_description || 'Desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.first_name && u.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.last_name && u.last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleColor = (role) => {
    switch(role) {
      case 'ADMIN': return '#ef4444';
      case 'GERENTE': return '#f59e0b';
      case 'CAJERO': return '#10b981';
      case 'BODEGUERO': return '#3b82f6';
      case 'VENDEDOR': return '#8b5cf6';
      case 'REPARTIDOR': return '#f472b6';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="page-container fade-in">
      <PageHeader title="Usuarios del Sistema" icon={Users}>
        <div className="header-title">
          <Users size={32} color="var(--primary)" />
          <div>
            
            <p style={{ color: 'var(--text-muted)' }}>Administra las cuentas de acceso, roles y permisos.</p>
          </div>
        </div>
        <button className="glass-button" onClick={openNewModal}>
          <Plus size={20} />
          Nuevo Usuario
        </button>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, margin: 0 }}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o usuario (username)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
        ) : (
          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Username de Acceso</th>
                  <th>Rol / Permisos</th>
                  <th style={{ textAlign: 'center' }}>Accesos</th>
                  <th>Último Acceso</th>
                  <th>PIN Kiosko</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '40px', height: '40px', 
                            borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)'
                          }}>
                            {u.first_name ? u.first_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <strong>{u.first_name} {u.last_name}</strong>
                        </div>
                      </td>
                      <td>
                        {u.username ? (
                          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                            {u.username}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>No definido</span>
                        )}
                      </td>
                      <td>
                        <span style={{ 
                          background: `${getRoleColor(u.role)}20`, 
                          color: getRoleColor(u.role),
                          padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                          {u.login_count || 0}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Nunca'}
                        </span>
                      </td>
                      <td>
                        {u.pin ? <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontFamily: 'monospace' }}>****</span> : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sin PIN</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="glass-button" 
                            style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }} 
                            title="Bitácora de Sesiones"
                            onClick={() => openHistoryModal(u)}
                          >
                            <Activity size={16} />
                          </button>
                          <button 
                            className="glass-button" 
                            style={{ padding: '8px' }} 
                            title="Editar Rol / Nombres"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No se encontraron usuarios.
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
          <div className="modal-content glass-panel" style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={24} color="var(--primary)" />
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button className="glass-button" style={{ padding: '8px' }} onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Nombres *</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    name="first_name" 
                    required
                    value={formData.first_name} 
                    onChange={handleInputChange} 
                  />
                </div>
                <div className="form-group">
                  <label>Apellidos *</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    name="last_name" 
                    required
                    value={formData.last_name} 
                    onChange={handleInputChange} 
                  />
                </div>
              </div>

              {!editingUser && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ marginBottom: '12px', color: 'var(--primary)' }}>Credenciales de Acceso</h4>
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label>Correo Electrónico (Login) *</label>
                    <input 
                      type="email" 
                      className="glass-input" 
                      name="email" 
                      required={!editingUser}
                      value={formData.email} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Contraseña *</label>
                    <input 
                      type="password" 
                      minLength={6}
                      className="glass-input" 
                      name="password" 
                      required={!editingUser}
                      value={formData.password} 
                      onChange={handleInputChange} 
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    El usuario generará un username automático al guardarse para poder ingresar con un código corto.
                  </p>
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: '16px' }}>
                <label>Rol en el Sistema *</label>
                <select 
                  className="glass-input" 
                  name="role" 
                  value={formData.role} 
                  onChange={handleInputChange} 
                  disabled={editingUser && editingUser.id === currentUser?.id}
                >
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="REPARTIDOR">Repartidor (Logística)</option>
                  <option value="CAJERO">Cajero</option>
                  <option value="BODEGUERO">Bodeguero</option>
                  <option value="GERENTE">Gerente</option>
                  <option value="ADMIN">Administrador</option>
                </select>
                {editingUser && editingUser.id === currentUser?.id && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>No puedes cambiar tu propio rol.</p>
                )}
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
                <label>PIN de Acceso (Kiosko Asistencia)</label>
                <input 
                  type="password" 
                  className="glass-input" 
                  name="pin" 
                  value={formData.pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
                    setFormData({...formData, pin: val});
                  }}
                  placeholder="Ej: 1234 (4 dígitos)"
                  maxLength="4"
                  style={{ letterSpacing: '4px', fontFamily: 'monospace', fontSize: '18px' }}
                />
                <small style={{ color: 'var(--text-muted)' }}>PIN opcional de 4 números para marcar asistencia.</small>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Guardando...' : (editingUser ? 'Guardar Cambios' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* History Modal */}
      {showHistoryModal && selectedHistoryUser && (
        <div className="modal-backdrop">
          <div className="modal-content glass-panel" style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Activity size={24} color="var(--primary)" />
                Bitácora de Sesiones: {selectedHistoryUser.first_name} {selectedHistoryUser.last_name}
              </h2>
              <button className="glass-button" style={{ padding: '8px' }} onClick={() => setShowHistoryModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando bitácora...</div>
              ) : sessionHistory.length > 0 ? (
                <div className="table-responsive">
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Hora Entrada</th>
                        <th>Último Pulso</th>
                        <th>Hora Salida</th>
                        <th>Tiempo en Sistema</th>
                        <th>Ubicación (GPS)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionHistory.map(session => {
                        const inTime = new Date(session.login_time);
                        const outTime = session.logout_time ? new Date(session.logout_time) : new Date(session.last_ping_time);
                        const durationMs = outTime.getTime() - inTime.getTime();
                        const durationMins = Math.floor(durationMs / 60000);
                        const durationHours = Math.floor(durationMins / 60);
                        const mins = durationMins % 60;
                        const durationStr = durationHours > 0 ? `${durationHours}h ${mins}m` : `${mins} min`;
                        const isOnline = !session.logout_time && (Date.now() - new Date(session.last_ping_time).getTime() < 5 * 60 * 1000);

                        return (
                          <tr key={session.id}>
                            <td>{inTime.toLocaleString()}</td>
                            <td>{new Date(session.last_ping_time).toLocaleTimeString()}</td>
                            <td>
                              {session.logout_time ? (
                                <span style={{ color: 'var(--primary)' }}>{new Date(session.logout_time).toLocaleString()} (Cierre)</span>
                              ) : isOnline ? (
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>En línea (Activa)</span>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>-- (Asumida: {outTime.toLocaleTimeString()})</span>
                              )}
                            </td>
                            <td><strong style={{ color: 'var(--text-main)' }}>{durationStr}</strong></td>
                            <td>
                              {session.latitude && session.longitude ? (
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${session.latitude},${session.longitude}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{ color: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <MapPin size={14} /> Ver en Mapa
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Sin GPS</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No hay sesiones registradas para este usuario.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Usuarios;
