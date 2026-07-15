import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { Users, Plus, Edit2, Trash2, Search, DownloadCloud, UploadCloud } from 'lucide-react';
import { DEPARTAMENTOS, MUNICIPIOS_NUEVOS, getDistritosPorMunicipio, ACTIVIDADES_ECONOMICAS } from '../utils/svCatalogs';
import { useTenantStore } from '../store/useTenantStore';
import * as XLSX from 'xlsx';

const Clients = () => {
  const { tenantInfo } = useTenantStore();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  
  const fileInputRef = useRef(null);
  const INITIAL_FORM_STATE = {
    name: 'Consumidor Final',
    business_name: '',
    email: '',
    phone: '',
    document_type: 'DUI',
    document_number: '',
    nrc: '',
    economic_activity_code: '',
    department_code: '12',
    municipality_code: 'San Miguel Centro',
    district: 'San Miguel',
    address: 'San Miguel',
    credit_limit: 0,
    points_balance: 0
  };
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  const [giroSearch, setGiroSearch] = useState('');
  const filteredGiros = ACTIVIDADES_ECONOMICAS.filter(act => 
    act.name.toLowerCase().includes(giroSearch.toLowerCase()) || 
    act.code.includes(giroSearch)
  ).slice(0, 50);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*, client_subscriptions(*, products(name))')
      .order('name', { ascending: true });
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
      setFormData(INITIAL_FORM_STATE);
      setGiroSearch('');
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
      document_type: client.document_type || 'DUI',
      document_number: client.document_number || '',
      nrc: client.nrc || '',
      economic_activity_code: client.economic_activity_code || '',
      department_code: client.department_code || '',
      municipality_code: client.municipality_code || '',
      district: client.district || '',
      address: client.address || '',
      credit_limit: client.credit_limit || 0,
      points_balance: client.points_balance || 0
    });
    setGiroSearch('');
    setEditingId(client.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
      await supabase.from('clients').delete().eq('id', id);
      fetchClients();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedClients.length === 0) return;
    if (window.confirm(`¿Estás seguro de eliminar ${selectedClients.length} cliente(s)?`)) {
      setLoading(true);
      const { error } = await supabase.from('clients').delete().in('id', selectedClients);
      if (error) {
        alert("Error eliminando clientes: " + error.message);
      } else {
        setSelectedClients([]);
        fetchClients();
      }
      setLoading(false);
    }
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedClients(clients.map(c => c.id));
    } else {
      setSelectedClients([]);
    }
  };

  const toggleSelectClient = (id) => {
    if (selectedClients.includes(id)) {
      setSelectedClients(selectedClients.filter(cId => cId !== id));
    } else {
      setSelectedClients([...selectedClients, id]);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = [
      "ID (Dejar vacío para crear nuevos)", "Nombre", "Nombre Comercial", "Email", "Telefono", "Tipo Documento (DUI, NIT, PASAPORTE, OTRO)", 
      "Numero Documento", "NRC", "Codigo Actividad Economica", "Direccion"
    ];
    
    // Si ya hay clientes, exportarlos para que puedan ser editados masivamente. Si no, poner un ejemplo.
    let dataToExport = [headers];
    
    if (clients.length > 0) {
      clients.forEach(c => {
        dataToExport.push([
          c.id, c.name, c.business_name || '', c.email || '', c.phone || '', c.document_type || 'DUI',
          c.document_number || '', c.nrc || '', c.economic_activity_code || '', c.address || ''
        ]);
      });
    } else {
      dataToExport.push([
        "", "Consumidor Final", "Comercial JP", "juan@example.com", "7777-7777", "DUI", 
        "12345678-9", "123456-7", "01111", "San Miguel Centro"
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(dataToExport);
    ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 15) }));
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "Directorio_Clientes_Masivo.xlsx");
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', userData.user.id).single();
      
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (rows.length < 2) throw new Error("El archivo Excel está vacío o no tiene el formato correcto.");
      rows.shift(); // Remove header

      let insertedCount = 0;
      let updatedCount = 0;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;
        
        const clientId = row[0] ? String(row[0]).trim() : null;
        const name = String(row[1] || 'Consumidor Final').trim();
        const business_name = String(row[2] || '').trim();
        const email = String(row[3] || '').trim();
        const phone = String(row[4] || '').trim();
        const document_type = String(row[5] || 'DUI').trim().toUpperCase();
        const document_number = String(row[6] || '').trim();
        const nrc = String(row[7] || '').trim();
        const economic_activity_code = String(row[8] || '').trim();
        const address = String(row[9] || 'San Miguel').trim();
        
        // Defaults if missing (using same defaults as UI)
        const department_code = '12';
        const municipality_code = 'San Miguel Centro';
        const district = 'San Miguel';

        const payload = {
          name, business_name, email, phone, document_type, document_number, 
          nrc, economic_activity_code, address, department_code, municipality_code, district
        };

        if (clientId) {
          // Update existing
          await supabase.from('clients').update(payload).eq('id', clientId);
          updatedCount++;
        } else {
          // Insert new
          await supabase.from('clients').insert([{ ...payload, tenant_id: profile.tenant_id }]);
          insertedCount++;
        }
      }
      
      alert(`Importación completada: ${insertedCount} clientes creados, ${updatedCount} actualizados.`);
      fetchClients();
    } catch (error) {
      console.error(error);
      alert("Error al importar Excel: " + error.message);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="page-container">
      <input
        type="file"
        accept=".xlsx, .xls"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleFileUpload}
      />
      <div className="page-header">
        <h1 className="page-title">Directorio de Clientes</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {selectedClients.length > 0 && (
            <button className="glass-button" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }} onClick={handleBulkDelete}>
              <Trash2 size={18} /> Eliminar Seleccionados ({selectedClients.length})
            </button>
          )}
          <button className="glass-button" onClick={handleDownloadTemplate} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <DownloadCloud size={18} /> Descargar Plantilla
          </button>
          <button className="glass-button" onClick={() => fileInputRef.current?.click()} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <UploadCloud size={18} /> Subir Excel
          </button>
          <button className="glass-button" onClick={() => {
            setEditingId(null);
            setFormData(INITIAL_FORM_STATE);
            setGiroSearch('');
            setShowModal(true);
          }}>
            <Plus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Cargando clientes...</div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={clients.length > 0 && selectedClients.length === clients.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Nombre del Cliente</th>
                <th>Razón Social</th>
                <th>Documento</th>
                <th>Contacto</th>
                <th>Crédito</th>
                <th>Puntos</th>
                {tenantInfo?.module_memberships !== false && <th>Membresías</th>}
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
                <tr key={client.id} style={{ background: selectedClients.includes(client.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedClients.includes(client.id)}
                      onChange={() => toggleSelectClient(client.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
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
                    {client.document_type === 'NIT' && client.nrc && (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        NRC: {client.nrc}
                      </div>
                    )}
                  </td>
                  <td>
                    {client.phone && <div>📞 {client.phone}</div>}
                    {client.email && <div>✉️ {client.email}</div>}
                    {!client.phone && !client.email && <span style={{ color: 'var(--text-muted)' }}>Sin contacto</span>}
                  </td>
                  <td>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: client.credit_limit > 0 ? '#10b981' : 'var(--text-muted)' }}>
                      ${Number(client.credit_limit || 0).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ⭐ {client.points_balance || 0}
                    </div>
                  </td>
                  {tenantInfo?.module_memberships !== false && (
                    <td>
                      {client.client_subscriptions && client.client_subscriptions.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {client.client_subscriptions.map(sub => {
                            const isExpired = new Date(sub.end_date) < new Date();
                            return (
                              <div key={sub.id} style={{ 
                                fontSize: '12px', 
                                padding: '4px 8px', 
                                borderRadius: '4px',
                                background: isExpired ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                color: isExpired ? '#ef4444' : '#10b981',
                                border: `1px solid ${isExpired ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                              }}>
                                <strong>{sub.products?.name}</strong><br/>
                                Vence: {new Date(sub.end_date).toLocaleDateString()}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Sin suscripciones</span>
                      )}
                    </td>
                  )}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tipo de Cliente</label>
                  <select className="glass-input" name="document_type" value={formData.document_type} onChange={handleInputChange}>
                    <option value="DUI">Consumidor Final (DUI)</option>
                    <option value="NIT">Empresa / Crédito Fiscal (NIT + NRC)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Nombre del Cliente *</label>
                  <input required type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} placeholder="Juan Perez..." />
                </div>
                {formData.document_type === 'DUI' ? (
                  <div className="form-group">
                    <label>Número de DUI</label>
                    <input type="text" className="glass-input" name="document_number" value={formData.document_number} onChange={handleInputChange} placeholder="00000000-0" />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Número de NIT</label>
                    <input type="text" className="glass-input" name="document_number" value={formData.document_number} onChange={handleInputChange} placeholder="0000-000000-000-0" />
                  </div>
                )}
              </div>

              {formData.document_type === 'NIT' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Razón Social (Empresa) *</label>
                      <input required type="text" className="glass-input" name="business_name" value={formData.business_name} onChange={handleInputChange} placeholder="Empresa S.A. de C.V." />
                    </div>
                    <div className="form-group">
                      <label>Número de NRC *</label>
                      <input required type="text" className="glass-input" name="nrc" value={formData.nrc} onChange={handleInputChange} placeholder="123456-7" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Giro / Actividad Económica *</label>
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input 
                        type="text" 
                        className="glass-input" 
                        style={{ paddingLeft: '36px' }} 
                        placeholder="Buscar giro (ej. Ropa, Computadoras...)" 
                        value={giroSearch}
                        onChange={(e) => setGiroSearch(e.target.value)}
                      />
                    </div>
                    <select required className="glass-input" name="economic_activity_code" value={formData.economic_activity_code} onChange={handleInputChange}>
                      <option value="">-- Selecciona una actividad --</option>
                      {filteredGiros.map(act => (
                        <option key={act.code} value={act.name}>{act.code} - {act.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                <div className="form-group">
                  <label>Límite de Crédito ($)</label>
                  <input type="number" step="0.01" min="0" className="glass-input" name="credit_limit" value={formData.credit_limit} onChange={handleInputChange} placeholder="0.00" />
                  <small style={{ color: 'var(--text-muted)' }}>0 significa que no tiene crédito.</small>
                </div>
                <div className="form-group">
                  <label>Puntos Acumulados</label>
                  <input type="number" min="0" className="glass-input" name="points_balance" value={formData.points_balance} onChange={handleInputChange} placeholder="0" />
                  <small style={{ color: 'var(--text-muted)' }}>Puedes ajustar los puntos manualmente.</small>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Departamento</label>
                  <select className="glass-input" name="department_code" value={formData.department_code} onChange={handleInputChange}>
                    <option value="">-- Seleccionar --</option>
                    {DEPARTAMENTOS.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Municipio</label>
                  <select className="glass-input" name="municipality_code" value={formData.municipality_code} onChange={handleInputChange} disabled={!formData.department_code}>
                    <option value="">-- Seleccionar --</option>
                    {formData.department_code && MUNICIPIOS_NUEVOS[formData.department_code]?.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Distrito</label>
                  <select className="glass-input" name="district" value={formData.district} onChange={handleInputChange} disabled={!formData.municipality_code}>
                    <option value="">-- Seleccionar --</option>
                    {formData.municipality_code && getDistritosPorMunicipio(formData.municipality_code).map(d => (
                      <option key={d.code} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Dirección Específica</label>
                <input type="text" className="glass-input" name="address" value={formData.address} onChange={handleInputChange} placeholder="Colonia, calle, # de casa..." />
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
