import React, { useState, useEffect } from 'react';
import { Truck, Search, Printer, CheckCircle, PackageOpen, Package } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import PageHeader from '../components/PageHeader';

const Despachos = () => {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sales, setSales] = useState([]);
  const [consolidado, setConsolidado] = useState([]);
  const [loading, setLoading] = useState(false);
  const { tenantInfo } = useTenantStore();

  useEffect(() => {
    fetchDrivers();
  }, []);

  useEffect(() => {
    if (selectedDriverId && selectedDate) {
      fetchCargas();
    } else {
      setSales([]);
      setConsolidado([]);
    }
  }, [selectedDriverId, selectedDate]);

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*').order('name');
    if (data) setDrivers(data);
  };

  const fetchCargas = async () => {
    setLoading(true);
    
    // Rango de fechas para el día completo local
    const startOfDay = new Date(`${selectedDate}T00:00:00`);
    const endOfDay = new Date(`${selectedDate}T23:59:59`);

    const { data: salesData, error } = await supabase
      .from('sales')
      .select(`
        id, created_at, subtotal, total, status, delivery_status,
        clients(name, document_number, address),
        sale_items(quantity, products(name, sku))
      `)
      .eq('driver_id', selectedDriverId)
      .in('delivery_status', ['CARGADO', 'ENTREGADO'])
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (!error && salesData) {
      setSales(salesData);
      
      // Construir el consolidado
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

  const markAsDelivered = async (saleId) => {
    if(window.confirm('¿Confirmar que esta orden fue entregada?')) {
      const { error } = await supabase.from('sales').update({ delivery_status: 'ENTREGADO' }).eq('id', saleId);
      if(!error) fetchCargas();
    }
  };

  const markAllAsDelivered = async () => {
    const pendingSales = sales.filter(s => s.delivery_status !== 'ENTREGADO');
    if (pendingSales.length === 0) return;
    
    if (window.confirm(`¿Confirmar que las ${pendingSales.length} órdenes fueron entregadas?`)) {
      const ids = pendingSales.map(s => s.id);
      const { error } = await supabase.from('sales').update({ delivery_status: 'ENTREGADO' }).in('id', ids);
      if(!error) fetchCargas();
    }
  };

  const handlePrintConsolidado = () => {
    const driver = drivers.find(d => d.id === selectedDriverId);
    
    let html = `
      <html>
      <head>
        <title>Hoja de Carga</title>
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
          <h2>Hoja de Consolidado de Carga</h2>
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
          <p>Firma de Recibido en Bodega</p>
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
      <PageHeader title="Hoja de Consolidado de Carga" icon={Package}>
        
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="form-group">
            <label>Seleccionar Ruta / Repartidor</label>
            <select className="glass-input" value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)}>
              <option value="">-- Elige un Repartidor --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} {d.plate_number ? `(${d.plate_number})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Fecha de Carga</label>
            <input type="date" className="glass-input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          </div>
        </div>
      </div>

      {selectedDriverId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
          
          {/* Lado Izquierdo: Consolidado (Total Sumado) */}
          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PackageOpen size={20} /> Consolidado de Carga</h3>
              {consolidado.length > 0 && (
                <button className="glass-button" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handlePrintConsolidado}>
                  <Printer size={16} /> Imprimir Hoja
                </button>
              )}
            </div>
            
            {loading ? <p>Calculando carga...</p> : consolidado.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No hay productos para cargar este día.</p> : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {consolidado.map((prod, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{prod.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SKU: {prod.sku}</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)' }}>
                      {prod.totalQty}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Lado Derecho: Lista de Facturas */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Órdenes / Facturas a Entregar</h3>
              {sales.some(s => s.delivery_status !== 'ENTREGADO') && (
                <button className="glass-button" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }} onClick={markAllAsDelivered}>
                  <CheckCircle size={16} /> Marcar TODAS como Entregadas
                </button>
              )}
            </div>

            {loading ? <p>Cargando facturas...</p> : sales.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No hay facturas asignadas a esta ruta.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sales.map(sale => (
                  <div key={sale.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{sale.clients?.name || 'Consumidor Final'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{sale.clients?.address || 'Sin dirección registrada'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>${sale.total.toFixed(2)}</div>
                        <span style={{ 
                          fontSize: '12px', padding: '2px 8px', borderRadius: '12px',
                          background: sale.delivery_status === 'ENTREGADO' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: sale.delivery_status === 'ENTREGADO' ? '#10b981' : '#f59e0b'
                        }}>
                          {sale.delivery_status}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {sale.sale_items.map((item, i) => (
                        <span key={i}>{item.quantity}x {item.products?.name}{i < sale.sale_items.length - 1 ? ', ' : ''}</span>
                      ))}
                    </div>

                    {sale.delivery_status !== 'ENTREGADO' && (
                      <button className="glass-button" style={{ width: '100%', padding: '8px', fontSize: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }} onClick={() => markAsDelivered(sale.id)}>
                        Confirmar Entrega Individual
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default Despachos;
