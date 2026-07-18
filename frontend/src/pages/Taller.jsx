import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import PageHeader from '../components/PageHeader';
import { Wrench, Plus, X, Search, CheckCircle, Clock, AlertCircle, PenTool, User, Tag, DollarSign, Package } from 'lucide-react';

const statusColors = {
  'RECIBIDO': { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6', icon: <Package size={16} /> },
  'EN_REVISION': { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7', icon: <Search size={16} /> },
  'ESPERANDO_REPUESTO': { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.3)', text: '#f97316', icon: <Clock size={16} /> },
  'REPARADO': { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e', icon: <CheckCircle size={16} /> },
  'ENTREGADO': { bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', text: '#64748b', icon: <CheckCircle size={16} /> },
  'CANCELADO': { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#ef4444', icon: <X size={16} /> }
};

const Taller = () => {
  const { tenantId } = useTenantStore();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    client_id: '',
    device_type: '',
    brand: '',
    model: '',
    serial_number: '',
    issue_description: '',
    estimated_cost: '',
    deposit: '',
    status: 'RECIBIDO'
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenantId) {
      fetchOrders();
      fetchClients();
    }
  }, [tenantId]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('user_profiles').select('branch_id').eq('id', user.id).single();

    let query = supabase
      .from('repair_orders')
      .select('*, clients(name, phone)')
      .eq('tenant_id', tenantId)
      .order('received_at', { ascending: false });

    if (profile?.branch_id) {
      query = query.eq('branch_id', profile.branch_id);
    }

    const { data, error } = await query;
    if (data) setOrders(data);
    if (error) console.error("Error fetching repair orders:", error);
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .order('name');
    if (data) setClients(data);
  };

  const handleOpenModal = (order = null) => {
    if (order) {
      setSelectedOrder(order);
      setFormData({
        client_id: order.client_id,
        device_type: order.device_type,
        brand: order.brand || '',
        model: order.model || '',
        serial_number: order.serial_number || '',
        issue_description: order.issue_description,
        estimated_cost: order.estimated_cost || '',
        deposit: order.deposit || '',
        status: order.status
      });
    } else {
      setSelectedOrder(null);
      setFormData({
        client_id: '',
        device_type: '',
        brand: '',
        model: '',
        serial_number: '',
        issue_description: '',
        estimated_cost: '',
        deposit: '',
        status: 'RECIBIDO'
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.client_id || !formData.device_type || !formData.issue_description) return;
    
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('user_profiles').select('branch_id').eq('id', user.id).single();
    
    const payload = {
      tenant_id: tenantId,
      branch_id: profile?.branch_id,
      client_id: formData.client_id,
      device_type: formData.device_type,
      brand: formData.brand,
      model: formData.model,
      serial_number: formData.serial_number,
      issue_description: formData.issue_description,
      estimated_cost: formData.estimated_cost ? Number(formData.estimated_cost) : null,
      deposit: formData.deposit ? Number(formData.deposit) : 0,
      status: formData.status
    };

    if (formData.status === 'ENTREGADO' && (!selectedOrder || selectedOrder.status !== 'ENTREGADO')) {
      payload.delivered_at = new Date().toISOString();
    }
    if (formData.status === 'REPARADO' && (!selectedOrder || selectedOrder.status !== 'REPARADO')) {
      payload.completed_at = new Date().toISOString();
    }

    let error = null;
    if (selectedOrder) {
      const { error: updateError } = await supabase
        .from('repair_orders')
        .update(payload)
        .eq('id', selectedOrder.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('repair_orders')
        .insert([payload]);
      error = insertError;
    }

    if (!error) {
      setShowModal(false);
      fetchOrders();
    } else {
      console.error("Error saving repair order", error);
      alert("Error al guardar la orden: " + error.message);
    }
    setSaving(false);
  };

  const filteredOrders = orders.filter(o => 
    o.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.device_type.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <PageHeader title="Órdenes de Reparación" icon={Wrench}>
        <button className="glass-button" onClick={() => handleOpenModal()}>
           Nueva Orden
        </button>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px', position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="glass-input" 
            placeholder="Buscar por cliente, equipo o ID..." 
            style={{ paddingLeft: '40px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando reparaciones...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Wrench size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No hay órdenes de reparación.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredOrders.map(order => {
              const status = statusColors[order.status] || statusColors['RECIBIDO'];
              return (
                <div 
                  key={order.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '16px', 
                    cursor: 'pointer', 
                    transition: 'transform 0.2s',
                    borderLeft: `4px solid ${status.text}`
                  }}
                  onClick={() => handleOpenModal(order)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} color="var(--text-muted)"/> {order.clients?.name}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>
                        ID: {order.id.substring(0,8).toUpperCase()}
                      </div>
                    </div>
                    <span style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      background: status.bg, border: `1px solid ${status.border}`, 
                      color: status.text, padding: '4px 8px', borderRadius: '20px', 
                      fontSize: '11px', fontWeight: 600 
                    }}>
                      {status.icon} {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MonitorDot size={14} color="var(--text-muted)"/>
                    <strong>{order.device_type}</strong> {order.brand} {order.model}
                  </div>
                  
                  <p style={{ 
                    fontSize: '13px', color: 'var(--text-muted)', 
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    marginBottom: '12px', minHeight: '38px'
                  }}>
                    {order.issue_description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Ingreso: {new Date(order.received_at).toLocaleDateString()}
                    </div>
                    {order.estimated_cost && (
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                        Est: ${Number(order.estimated_cost).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '95%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>{selectedOrder ? 'Actualizar Orden' : 'Nueva Orden de Reparación'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label>Cliente *</label>
                  <select 
                    className="glass-input" 
                    required 
                    value={formData.client_id}
                    onChange={e => setFormData({...formData, client_id: e.target.value})}
                  >
                    <option value="">— Seleccionar Cliente —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Tipo de Equipo *</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Ej. Celular, Laptop..." 
                    required
                    value={formData.device_type}
                    onChange={e => setFormData({...formData, device_type: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Marca</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Ej. Samsung, Apple..." 
                    value={formData.brand}
                    onChange={e => setFormData({...formData, brand: e.target.value})}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Modelo</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Número de Serie / IMEI</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    value={formData.serial_number}
                    onChange={e => setFormData({...formData, serial_number: e.target.value})}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                  <label>Descripción del Problema *</label>
                  <textarea 
                    className="glass-input" 
                    rows="3" 
                    required
                    value={formData.issue_description}
                    onChange={e => setFormData({...formData, issue_description: e.target.value})}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Costo Estimado ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    className="glass-input" 
                    value={formData.estimated_cost}
                    onChange={e => setFormData({...formData, estimated_cost: e.target.value})}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Abono / Depósito ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    className="glass-input" 
                    value={formData.deposit}
                    onChange={e => setFormData({...formData, deposit: e.target.value})}
                  />
                </div>

                {selectedOrder && (
                  <div className="form-group" style={{ gridColumn: '1 / -1', marginBottom: 0 }}>
                    <label>Estado de la Reparación</label>
                    <select 
                      className="glass-input" 
                      style={{ fontWeight: 'bold' }}
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                    >
                      <option value="RECIBIDO">📦 Recibido</option>
                      <option value="EN_REVISION">🔍 En Revisión</option>
                      <option value="ESPERANDO_REPUESTO">⏳ Esperando Repuesto</option>
                      <option value="REPARADO">✅ Reparado</option>
                      <option value="ENTREGADO">🤝 Entregado al Cliente</option>
                      <option value="CANCELADO">❌ Cancelado / Sin Solución</option>
                    </select>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="glass-button" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Taller;
