import React, { useState, useEffect } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../supabase';
import { createClient } from '@supabase/supabase-js';
import { useTenantStore } from '../../store/useTenantStore';
import { Plus, Edit2, Trash2, User, UserPlus, FileText, Shield, Truck, Users } from 'lucide-react';
import PageHeader from '../../components/PageHeader';

const DirectorioRRHH = () => {
  const { tenantInfo } = useTenantStore();
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  
  const [systemUsers, setSystemUsers] = useState([]);
  const [linkExistingUser, setLinkExistingUser] = useState(false);
  
  const [giveAccess, setGiveAccess] = useState(false);
  const [isDriver, setIsDriver] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    document_id: '',
    hire_date: '',
    position_id: '',
    base_salary: '',
    status: 'ACTIVO',
    // Access fields
    email: '',
    password: '',
    password: '',
    role: 'VENDEDOR',
    // Existing user link
    linked_user_id: '',
    // Driver fields
    plate_number: '',
    phone: ''
  });

  useEffect(() => {
    if (tenantInfo?.id) {
      fetchData();
    }
  }, [tenantInfo]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Positions
    const { data: posData } = await supabase.from('hr_positions').select('id, name, base_salary');
    if (posData) setPositions(posData);

    // Fetch HR Employees
    const { data, error } = await supabase
      .from('hr_employees')
      .select('*, hr_positions(name, base_salary), user_profiles(username, role)')
      .order('first_name');
      
    if (!error && data) {
      setEmployees(data);
    } else if (error) {
      console.error('Error fetching HR employees:', error);
    }

    // Fetch System Users that could be linked
    const { data: sysUsers, error: sysError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, username, role')
      .eq('tenant_id', tenantInfo?.id)
      .order('first_name');
    
    if (sysError) console.error("Error fetching system users:", sysError);
    if (sysUsers) setSystemUsers(sysUsers);

    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    
    if (name === 'position_id' && value && !formData.base_salary) {
      const selectedPos = positions.find(p => p.id === value);
      if (selectedPos && selectedPos.base_salary) {
        newData.base_salary = selectedPos.base_salary;
      }
    }
    
    setFormData(newData);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!tenantInfo?.id) return;
    setSaving(true);
    
    let createdUserId = null;

    try {
      // 1A. Link existing user
      if (linkExistingUser && !editingEmp && formData.linked_user_id) {
        createdUserId = formData.linked_user_id;
      }
      // 1B. Create System User if requested (and not editing an existing user access)
      else if (giveAccess && !editingEmp) {
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        const { data: authData, error: authError } = await tempClient.auth.signUp({
          email: formData.email,
          password: formData.password,
        });

        if (authError) throw authError;

        createdUserId = authData.user?.id;
        if (!createdUserId) throw new Error("No se pudo obtener el ID del nuevo usuario.");

        const sanitize = str => (str || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 3);
        const prefix = (tenantInfo?.tenant_prefix || sanitize(tenantInfo?.name || 'emp')).toLowerCase().replace(/[^a-z0-9]/g, '');
        const fName = sanitize(formData.first_name);
        const lName = sanitize(formData.last_name);
        const generatedUsername = `${prefix}${fName}${lName}`;

        const { error: rpcError } = await supabase.rpc('admin_create_user_profile', {
          p_user_id: createdUserId,
          p_role: formData.role,
          p_first_name: formData.first_name,
          p_last_name: formData.last_name,
          p_username: generatedUsername
        });

        if (rpcError) throw rpcError;
      }

      // 2. HR Employee Payload
      const hrPayload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        document_id: formData.document_id || null,
        hire_date: formData.hire_date || null,
        position_id: formData.position_id || null,
        base_salary: parseFloat(formData.base_salary) || 0,
        status: formData.status
      };

      if (createdUserId) {
        hrPayload.user_id = createdUserId;
      }

      let employeeIdToUse = null;

      if (editingEmp) {
        const { error } = await supabase.from('hr_employees').update(hrPayload).eq('id', editingEmp.id);
        if (error) throw error;
        employeeIdToUse = editingEmp.id;
      } else {
        const { data: inserted, error } = await supabase.from('hr_employees').insert([{ ...hrPayload, tenant_id: tenantInfo.id }]).select();
        if (error) throw error;
        if (inserted && inserted.length > 0) employeeIdToUse = inserted[0].id;
      }

      // 3. Create Driver if requested
      if (isDriver && !editingEmp && employeeIdToUse) {
        const { error: driverError } = await supabase.from('drivers').insert([{
          tenant_id: tenantInfo.id,
          name: `${formData.first_name} ${formData.last_name}`,
          phone: formData.phone || null,
          plate_number: formData.plate_number || null
        }]);
        if (driverError) throw driverError;
      }
      
      setShowModal(false);
      setEditingEmp(null);
      resetForm();
      fetchData();
    } catch (error) {
      alert('Error guardando empleado: ' + (error.message || error.error_description));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este empleado del directorio?')) {
      try {
        const { error } = await supabase.from('hr_employees').delete().eq('id', id);
        if (error) throw error;
        fetchData();
      } catch (error) {
        alert('Error eliminando: ' + error.message);
      }
    }
  };

  const openEdit = (emp) => {
    setEditingEmp(emp);
    setGiveAccess(false);
    setLinkExistingUser(false);
    setIsDriver(false);
    setFormData({
      first_name: emp.first_name,
      last_name: emp.last_name,
      document_id: emp.document_id || '',
      hire_date: emp.hire_date ? emp.hire_date.split('T')[0] : '',
      position_id: emp.position_id || '',
      base_salary: emp.base_salary || '',
      status: emp.status || 'ACTIVO',
      email: '', password: '', role: 'VENDEDOR', plate_number: '', phone: ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setGiveAccess(false);
    setLinkExistingUser(false);
    setIsDriver(false);
    setFormData({
      first_name: '', last_name: '', document_id: '', hire_date: '',
      position_id: '', base_salary: '', status: 'ACTIVO',
      email: '', password: '', role: 'VENDEDOR', linked_user_id: '', plate_number: '', phone: ''
    });
  };

  return (
    <div className="page-full-height" style={{ gap: '24px' }}>
      <PageHeader title="Directorio de Personal y RRHH" icon={Users}>
        <div>
          
          <p className="page-subtitle">Gestiona de forma unificada la información de tus empleados y sus accesos.</p>
        </div>
        <button className="glass-button" onClick={() => {
          setEditingEmp(null);
          resetForm();
          setShowModal(true);
        }}>
          <UserPlus size={18} /> Registrar Empleado
        </button>
      </PageHeader>
      
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando empleados...</div>
        ) : (
          <div className="panel-scrollable">
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Empleado</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>DUI / Doc.</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Cargo / Salario</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Estado</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Acceso al Sistema</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay personal registrado en la empresa.</td>
                  </tr>
                )}
                {employees.map(emp => (
                  <tr key={emp.id} style={{ opacity: emp.status !== 'ACTIVO' ? 0.6 : 1 }}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)' }}>
                          <User size={18} />
                        </div>
                        <div>
                          <div>{emp.first_name} {emp.last_name}</div>
                          {emp.hire_date && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ingreso: {emp.hire_date}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{emp.document_id || '-'}</td>
                    <td>
                      <div>{emp.hr_positions?.name || 'Sin Cargo'}</div>
                      <div style={{ fontWeight: 500, color: 'var(--success)', fontSize: '11px' }}>${Number(emp.base_salary).toFixed(2)} Base</div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                        background: emp.status === 'ACTIVO' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: emp.status === 'ACTIVO' ? '#22c55e' : '#ef4444'
                      }}>
                        {emp.status}
                      </span>
                    </td>
                    <td>
                      {emp.user_profiles?.username ? (
                        <div>
                          <span style={{ fontFamily: 'monospace', color: 'var(--primary)', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                            @{emp.user_profiles.username}
                          </span>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Rol: {emp.user_profiles.role}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sin Acceso</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="glass-button" 
                          style={{ padding: '6px', minWidth: 'auto' }}
                          title="Editar Ficha"
                          onClick={() => openEdit(emp)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="glass-button" 
                          style={{ padding: '6px', minWidth: 'auto', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                          title="Eliminar"
                          onClick={() => handleDelete(emp.id)}
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
          <div className="modal-content glass-panel" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingEmp ? 'Editar Ficha de Empleado' : 'Registrar Nuevo Empleado'}</h2>
            <form onSubmit={handleSave}>
              
              <h3 style={{ fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px' }}>
                Datos Personales y Laborales
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input required type="text" className="glass-input" name="first_name" value={formData.first_name} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Apellido *</label>
                  <input required type="text" className="glass-input" name="last_name" value={formData.last_name} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>DUI / Documento</label>
                  <input type="text" className="glass-input" name="document_id" value={formData.document_id} onChange={handleInputChange} placeholder="00000000-0" />
                </div>
                <div className="form-group">
                  <label>Fecha de Contratación</label>
                  <input type="date" className="glass-input" name="hire_date" value={formData.hire_date} onChange={handleInputChange} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Cargo</label>
                  <select className="glass-input" name="position_id" value={formData.position_id} onChange={handleInputChange}>
                    <option value="">Ninguno...</option>
                    {positions.map(pos => <option key={pos.id} value={pos.id}>{pos.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Salario Base Mensual</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>$</span>
                    <input type="number" step="0.01" min="0" className="glass-input" name="base_salary" value={formData.base_salary} onChange={handleInputChange} style={{ paddingLeft: '24px' }} placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>Estado Laboral</label>
                <select className="glass-input" style={{ width: '50%' }} name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="ACTIVO">Activo</option>
                  <option value="INACTIVO">Inactivo / Despedido</option>
                  <option value="SUSPENDIDO">Suspendido</option>
                </select>
              </div>

              {/* Toggles Solo al Crear */}
              {!editingEmp && (
                <>
                  <div style={{ marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 500 }}>
                      <input 
                        type="checkbox" 
                        checked={linkExistingUser} 
                        onChange={(e) => {
                          setLinkExistingUser(e.target.checked);
                          if (e.target.checked) setGiveAccess(false);
                        }} 
                        style={{ transform: 'scale(1.2)' }} 
                      />
                      <User size={18} color="var(--primary)" />
                      Vincular a un Usuario de Sistema Existente
                    </label>
                    <p style={{ margin: '8px 0 0 24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Si este empleado ya tiene una cuenta en el sistema (ej. el Administrador), selecciónalo aquí.
                    </p>

                    {linkExistingUser && (
                      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', marginLeft: '24px' }}>
                        <div className="form-group">
                          <label>Seleccionar Usuario Existente</label>
                          <select className="glass-input" name="linked_user_id" value={formData.linked_user_id} onChange={handleInputChange} required={linkExistingUser}>
                            <option value="">-- Seleccionar --</option>
                            {systemUsers.map(su => (
                              <option key={su.id} value={su.id}>
                                {su.first_name || su.last_name ? `${su.first_name || ''} ${su.last_name || ''}` : su.username || 'Sin Nombre'} ({su.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', opacity: linkExistingUser ? 0.5 : 1, pointerEvents: linkExistingUser ? 'none' : 'auto' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 500 }}>
                      <input type="checkbox" checked={giveAccess} onChange={(e) => setGiveAccess(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                      <Shield size={18} color="var(--primary)" />
                      Crear Cuenta Nueva y Otorgar Acceso
                    </label>
                    <p style={{ margin: '8px 0 0 24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Crea una cuenta de usuario NUEVA para que pueda loguearse al POS, App Móvil o panel administrativo.
                    </p>
                    
                    {giveAccess && (
                      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label>Correo Electrónico (Login) *</label>
                          <input required={giveAccess} type="email" className="glass-input" name="email" value={formData.email} onChange={handleInputChange} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label>Contraseña *</label>
                            <input required={giveAccess} type="password" minLength={6} className="glass-input" name="password" value={formData.password} onChange={handleInputChange} />
                          </div>
                          <div className="form-group">
                            <label>Rol en Sistema</label>
                            <select className="glass-input" name="role" value={formData.role} onChange={handleInputChange}>
                              <option value="VENDEDOR">Vendedor</option>
                              <option value="CAJERO">Cajero</option>
                              <option value="BODEGUERO">Bodeguero</option>
                              <option value="GERENTE">Gerente</option>
                              <option value="ADMIN">Administrador</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {tenantInfo?.module_logistics !== false && (
                    <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 500 }}>
                        <input type="checkbox" checked={isDriver} onChange={(e) => setIsDriver(e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                        <Truck size={18} color="var(--primary)" />
                        Es Repartidor / Motorista
                      </label>
                      <p style={{ margin: '8px 0 0 24px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        Agrega a este empleado a la lista de repartidores disponibles para asignar envíos.
                      </p>

                      {isDriver && (
                        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                          <div className="form-group">
                            <label>Teléfono Motorista</label>
                            <input type="text" className="glass-input" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Ej. 7000-0000" />
                          </div>
                          <div className="form-group">
                            <label>Número de Placa (Vehículo)</label>
                            <input type="text" className="glass-input" name="plate_number" value={formData.plate_number} onChange={handleInputChange} placeholder="P-123456" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255, 255, 255, 0.05)' }} onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Ficha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectorioRRHH;
