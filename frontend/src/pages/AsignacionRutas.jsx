import React, { useState, useEffect } from 'react';
import { Truck, Search, UserCheck, Calendar, MapPin } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';

const AsignacionRutas = () => {
  const [drivers, setDrivers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [checkedItems, setCheckedItems] = useState({});
  const { tenantId } = useTenantStore();

  useEffect(() => {
    if (tenantId) {
      fetchDrivers();
      fetchPendingSales();
    }
  }, [tenantId]);

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*').order('name');
    if (data) setDrivers(data);
  };

  const fetchPendingSales = async () => {
    setLoading(true);
    setCheckedItems({});
    
    // Fetch ventas que están pendientes de carga pero NO tienen conductor asignado
    const { data: salesData, error } = await supabase
      .from('sales')
      .select(`
        id, created_at, total, delivery_status,
        clients(name, document_number, address),
        sale_items(quantity, products(name))
      `)
      .eq('tenant_id', tenantId)
      .eq('delivery_status', 'PENDIENTE_DE_CARGA')
      .is('driver_id', null)
      .order('created_at', { ascending: false });

    if (!error && salesData) {
      setSales(salesData);
    }
    setLoading(false);
  };

  const toggleCheck = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAll = (e) => {
    const checked = e.target.checked;
    const newChecked = {};
    sales.forEach(sale => {
      newChecked[sale.id] = checked;
    });
    setCheckedItems(newChecked);
  };

  const getSelectedCount = () => {
    return Object.values(checkedItems).filter(Boolean).length;
  };

  const handleAssign = async () => {
    const selectedIds = Object.keys(checkedItems).filter(id => checkedItems[id]);
    
    if (selectedIds.length === 0) {
      alert("Selecciona al menos un pedido para asignar.");
      return;
    }
    
    if (!selectedDriverId) {
      alert("Por favor, selecciona un repartidor.");
      return;
    }
    
    const driver = drivers.find(d => d.id === selectedDriverId);
    
    if (!window.confirm(`¿Asignar ${selectedIds.length} pedido(s) a ${driver?.name}?`)) return;

    setAssigning(true);
    try {
      const { error } = await supabase
        .from('sales')
        .update({ driver_id: selectedDriverId })
        .in('id', selectedIds);

      if (error) throw error;
      
      alert('Rutas asignadas exitosamente. Ya puedes revisar la carga.');
      setSelectedDriverId('');
      fetchPendingSales();
    } catch (err) {
      console.error(err);
      alert('Error al asignar rutas: ' + err.message);
    } finally {
      setAssigning(false);
    }
  };

  const allSelected = sales.length > 0 && getSelectedCount() === sales.length;

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      <PageHeader title="Asignación de Rutas" icon={MapPin}>
        <button 
          className="glass-button" 
          onClick={fetchPendingSales}
          style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)' }}
        >
          Actualizar Lista
        </button>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Seleccionar Repartidor para los pedidos marcados</label>
            <select 
              className="glass-input" 
              value={selectedDriverId} 
              onChange={e => setSelectedDriverId(e.target.value)}
            >
              <option value="">-- Elige un Repartidor --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.plate_number ? `(${d.plate_number})` : ''}</option>
              ))}
            </select>
          </div>
          <button 
            className="glass-button" 
            onClick={handleAssign}
            disabled={assigning || getSelectedCount() === 0 || !selectedDriverId}
            style={{ 
              background: getSelectedCount() > 0 && selectedDriverId ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', height: '42px'
            }}
          >
            <UserCheck size={18} />
            {assigning ? 'Asignando...' : `Asignar ${getSelectedCount()} pedido(s)`}
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={20} color="var(--primary)" /> 
          Pedidos Sin Asignar ({sales.length})
        </h3>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Buscando pedidos...</p>
        ) : sales.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Truck size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
            <p>No hay pedidos pendientes sin asignar.</p>
            <p style={{ fontSize: '13px' }}>¡Todo está en ruta o entregado!</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th>Cliente y Dirección</th>
                  <th>Productos</th>
                  <th>Fecha del Pedido</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => {
                  const dateObj = new Date(sale.created_at);
                  return (
                    <tr key={sale.id} className={checkedItems[sale.id] ? 'selected-row' : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={!!checkedItems[sale.id]}
                          onChange={() => toggleCheck(sale.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td onClick={() => toggleCheck(sale.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontWeight: 600 }}>{sale.clients?.name || 'Consumidor Final'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {sale.clients?.address || 'Sin dirección registrada'}
                        </div>
                      </td>
                      <td onClick={() => toggleCheck(sale.id)} style={{ cursor: 'pointer' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sale.sale_items.map(i => `${i.quantity}x ${i.products?.name}`).join(', ')}
                        </div>
                      </td>
                      <td onClick={() => toggleCheck(sale.id)} style={{ cursor: 'pointer', fontSize: '13px' }}>
                        {dateObj.toLocaleDateString()} {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td onClick={() => toggleCheck(sale.id)} style={{ cursor: 'pointer', textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>
                        ${sale.total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <style>{`
        .selected-row td {
          background: rgba(var(--primary-rgb), 0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default AsignacionRutas;
