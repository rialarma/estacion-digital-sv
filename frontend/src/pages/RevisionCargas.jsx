import React, { useState, useEffect } from 'react';
import { Truck, CheckSquare, Square, PackageOpen, CheckCircle, Printer } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';

const RevisionCargas = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [consolidado, setConsolidado] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  
  const { tenantInfo } = useTenantStore();

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (selectedDriverId && selectedDate) {
      fetchCargas();
    } else {
      setConsolidado([]);
      setCheckedItems({});
    }
  }, [selectedDriverId, selectedDate]);

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*').order('name');
    if (data) setDrivers(data);
  };

  const fetchCargas = async () => {
    setLoading(true);
    setCheckedItems({});
    
    const startOfDay = new Date(`${selectedDate}T00:00:00`);
    const endOfDay = new Date(`${selectedDate}T23:59:59`);

    const { data: salesData, error } = await supabase
      .from('sales')
      .select(`
        id, created_at, status, delivery_status,
        sale_items(quantity, products(name, sku))
      `)
      .eq('driver_id', selectedDriverId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .eq('delivery_status', 'PENDIENTE_DE_CARGA')
      .order('created_at', { ascending: false });

    if (!error && salesData) {
      const prodMap = {};
      salesData.forEach(sale => {
        sale.sale_items.forEach(item => {
          const prodName = item.products?.name || 'Desconocido';
          const sku = item.products?.sku || '';
          const key = `${sku}-${prodName}`;
          
          if (!prodMap[key]) {
            prodMap[key] = { sku, name: prodName, totalQty: 0 };
          }
          prodMap[key].totalQty += Number(item.quantity);
        });
      });
      
      setConsolidado(Object.values(prodMap).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setLoading(false);
  };

  const toggleCheck = (index) => {
    setCheckedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const allChecked = consolidado.length > 0 && consolidado.every((_, i) => checkedItems[i]);

  const handleApproveLoad = async () => {
    if (!allChecked) {
      alert("Debes confirmar (marcar) todos los productos antes de aprobar la carga.");
      return;
    }
    
    if (!window.confirm("¿Confirmar que todos estos productos han sido subidos al camión?")) return;

    setApproving(true);
    try {
      const startOfDay = new Date(`${selectedDate}T00:00:00`);
      const endOfDay = new Date(`${selectedDate}T23:59:59`);

      const { error } = await supabase
        .from('sales')
        .update({ delivery_status: 'CARGADO' })
        .eq('driver_id', selectedDriverId)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .eq('delivery_status', 'PENDIENTE_DE_CARGA');

      if (error) throw error;

      alert("¡Carga aprobada con éxito! Las facturas ya están disponibles para el repartidor.");
      fetchCargas(); // Recargar (debería vaciarse)
    } catch (err) {
      console.error(err);
      alert("Error al aprobar la carga: " + err.message);
    } finally {
      setApproving(false);
    }
  };

  const handlePrintConsolidado = () => {
    const driver = drivers.find(d => d.id === selectedDriverId);
    
    let html = `
      <html>
      <head>
        <title>Hoja de Revisión de Carga</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .header { text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>Hoja de Revisión de Carga (Bodega)</h2>
          <p><strong>Repartidor / Ruta:</strong> ${driver?.name || ''} ${driver?.plate_number ? `(${driver.plate_number})` : ''}</p>
          <p><strong>Fecha:</strong> ${selectedDate}</p>
        </div>
        
        <h3>Totales a Cargar</h3>
        <table>
          <thead><tr><th>SKU</th><th>Producto</th><th>Cantidad Total a Cargar</th></tr></thead>
          <tbody>
            ${consolidado.map(c => `<tr><td>${c.sku}</td><td>${c.name}</td><td><strong>${c.totalQty}</strong></td></tr>`).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 50px;">
          <p>___________________________________</p>
          <p>Firma de Bodeguero (Despachador)</p>
          
          <p style="margin-top: 40px;">___________________________________</p>
          <p>Firma de Repartidor (Recibe conforme)</p>
        </div>
      </body>
      </html>
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(html);
    iframe.contentDocument.close();
    
    iframe.onload = () => {
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 500);
    };
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Revisión de Cargas (Bodega)</h1>
      </div>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
          Selecciona un repartidor y una fecha para ver los productos consolidados que están pendientes de ser cargados en el camión.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Seleccionar Ruta / Repartidor</label>
            <select className="glass-input" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
              <option value="">-- Elige un Repartidor --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.plate_number ? `(${d.plate_number})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fecha de Carga</label>
            <input type="date" className="glass-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedDriverId && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PackageOpen size={20} /> Lista de Verificación
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {consolidado.length > 0 && (
                <span style={{ fontSize: '13px', color: allChecked ? '#10b981' : 'var(--text-muted)' }}>
                  {Object.values(checkedItems).filter(Boolean).length} de {consolidado.length} productos validados
                </span>
              )}
              {consolidado.length > 0 && (
                <button className="glass-button" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handlePrintConsolidado}>
                  <Printer size={16} /> Imprimir Hoja
                </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Calculando carga pendiente...</p>
          ) : consolidado.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No hay productos pendientes de carga para esta ruta y fecha.</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {consolidado.map((prod, idx) => {
                  const isChecked = checkedItems[idx] || false;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleCheck(idx)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '16px', 
                        background: isChecked ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ color: isChecked ? '#10b981' : 'var(--text-muted)' }}>
                          {isChecked ? <CheckSquare size={24} /> : <Square size={24} />}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '16px', color: isChecked ? '#10b981' : 'var(--text-main)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                            {prod.name}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>SKU: {prod.sku}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: isChecked ? '#10b981' : 'var(--primary)' }}>
                        {prod.totalQty}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '24px', textAlign: 'right' }}>
                <button 
                  className="glass-button" 
                  disabled={!allChecked || approving}
                  onClick={handleApproveLoad}
                  style={{ 
                    background: allChecked ? '#10b981' : 'var(--border-color)',
                    borderColor: allChecked ? '#10b981' : 'var(--border-color)',
                    color: allChecked ? 'white' : 'var(--text-muted)',
                    padding: '12px 24px',
                    fontSize: '16px'
                  }}
                >
                  {approving ? 'Procesando...' : <><CheckCircle size={20} /> Aprobar Carga de Camión</>}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RevisionCargas;
