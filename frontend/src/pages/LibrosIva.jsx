import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { Download, Calendar, FileText } from 'lucide-react';

const LibrosIva = () => {
  const { tenantId } = useTenantStore();
  const [activeTab, setActiveTab] = useState('FCF'); // 'FCF', 'CCF', 'COMPRAS'
  const [loading, setLoading] = useState(false);
  
  // Date filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Data state
  const [ventasFCF, setVentasFCF] = useState([]);
  const [ventasCCF, setVentasCCF] = useState([]);
  const [compras, setCompras] = useState([]);

  useEffect(() => {
    if (tenantId) fetchBooksData();
  }, [tenantId, selectedMonth, selectedYear, activeTab]);

  const fetchBooksData = async () => {
    setLoading(true);
    
    // Rango de fechas
    const startDate = new Date(selectedYear, selectedMonth - 1, 1).toISOString();
    const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59).toISOString();

    try {
      if (activeTab === 'FCF') {
        // Ventas Consumidor Final (DTE Type '01' o sin DTE clasificado como FCF)
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id,
            created_at,
            total,
            tax_iva,
            subtotal,
            dtes ( dte_type, codigo_generacion )
          `)
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Filtrar solo los que son Consumidor Final (DTE 01)
        const fcfSales = data.filter(s => s.dtes?.some(d => d.dte_type === '01') || !s.dtes || s.dtes.length === 0);
        setVentasFCF(fcfSales);
      } 
      else if (activeTab === 'CCF') {
        // Ventas a Contribuyentes (DTE Type '03')
        const { data, error } = await supabase
          .from('sales')
          .select(`
            id,
            created_at,
            total,
            tax_iva,
            subtotal,
            clients ( name, nrc ),
            dtes ( dte_type, codigo_generacion )
          `)
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        // Filtrar solo Crédito Fiscal (DTE 03)
        const ccfSales = data.filter(s => s.dtes?.some(d => d.dte_type === '03'));
        setVentasCCF(ccfSales);
      }
      else if (activeTab === 'COMPRAS') {
        // Compras
        const { data, error } = await supabase
          .from('purchases')
          .select(`
            id,
            created_at,
            total,
            document_number,
            document_type,
            suppliers ( name, nrc )
          `)
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setCompras(data || []);
      }
    } catch (err) {
      console.error("Error cargando libros:", err);
      alert("Error al cargar los datos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM para UTF-8 en Excel
    let rows = [];

    if (activeTab === 'FCF') {
      rows.push(["Fecha", "No. Comprobante / Cod. Generación", "Ventas Exentas", "Ventas Gravadas", "IVA", "Total"]);
      ventasFCF.forEach(v => {
        const dte = v.dtes && v.dtes.length > 0 ? v.dtes[0].codigo_generacion : v.id.slice(0,8);
        const fecha = new Date(v.created_at).toLocaleDateString();
        rows.push([
          fecha, 
          dte, 
          "0.00", 
          Number(v.subtotal).toFixed(2), 
          Number(v.tax_iva).toFixed(2), 
          Number(v.total).toFixed(2)
        ]);
      });
    } else if (activeTab === 'CCF') {
      rows.push(["Fecha", "No. Comprobante / Cod. Generación", "Nombre del Cliente", "NRC", "Ventas Exentas", "Ventas Gravadas", "IVA Débito Fiscal", "Total"]);
      ventasCCF.forEach(v => {
        const dte = v.dtes && v.dtes.length > 0 ? v.dtes[0].codigo_generacion : v.id.slice(0,8);
        const fecha = new Date(v.created_at).toLocaleDateString();
        rows.push([
          fecha, 
          dte, 
          v.clients?.name || "Sin Cliente", 
          v.clients?.nrc || "", 
          "0.00", 
          Number(v.subtotal).toFixed(2), 
          Number(v.tax_iva).toFixed(2), 
          Number(v.total).toFixed(2)
        ]);
      });
    } else if (activeTab === 'COMPRAS') {
      rows.push(["Fecha", "No. Comprobante", "Nombre del Proveedor", "NRC", "Compras Exentas", "Compras Gravadas Internas", "IVA Crédito Fiscal", "Total Compras"]);
      compras.forEach(c => {
        const fecha = new Date(c.created_at).toLocaleDateString();
        const total = Number(c.total);
        let subtotal = total;
        let tax_iva = 0;
        
        // Si es CCF, calculamos el IVA interno (asumiendo total con IVA)
        if (c.document_type === 'CCF') {
            subtotal = total / 1.13;
            tax_iva = total - subtotal;
        }

        rows.push([
          fecha, 
          c.document_number || c.id.slice(0,8), 
          c.suppliers?.name || "Sin Proveedor", 
          c.suppliers?.nrc || "", 
          "0.00", 
          subtotal.toFixed(2), 
          tax_iva.toFixed(2), 
          total.toFixed(2)
        ]);
      });
    }

    rows.forEach(rowArray => {
      let row = rowArray.join(";"); // Usamos ; para que Excel en español lo separe bien
      csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const fileName = `Libro_${activeTab}_${selectedMonth}_${selectedYear}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Libros de IVA</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass-button" onClick={exportToCSV} style={{ background: 'var(--primary)', color: '#000' }}>
            <Download size={18} /> Exportar a CSV (Excel)
          </button>
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '300px' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label>Mes</label>
              <select className="glass-input" value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}>
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label>Año</label>
              <select className="glass-input" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '12px' }}>
            <button 
              className={`glass-button ${activeTab === 'FCF' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('FCF')}
              style={{ background: activeTab === 'FCF' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              <FileText size={16} /> Consumidor Final
            </button>
            <button 
              className={`glass-button ${activeTab === 'CCF' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('CCF')}
              style={{ background: activeTab === 'CCF' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              <FileText size={16} /> Crédito Fiscal
            </button>
            <button 
              className={`glass-button ${activeTab === 'COMPRAS' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('COMPRAS')}
              style={{ background: activeTab === 'COMPRAS' ? 'rgba(255,255,255,0.1)' : 'transparent' }}
            >
              <FileText size={16} /> Compras
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando datos...</div>
        ) : (
          <div className="table-responsive">
            <table className="glass-table">
              {activeTab === 'FCF' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Comprobante / Cod. Generación</th>
                      <th>Gravado</th>
                      <th>IVA</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasFCF.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center' }}>No hay ventas a consumidor final este mes.</td></tr>
                    ) : (
                      ventasFCF.map(v => (
                        <tr key={v.id}>
                          <td>{new Date(v.created_at).toLocaleDateString()}</td>
                          <td><span style={{ fontSize: '11px', opacity: 0.8 }}>{v.dtes && v.dtes.length > 0 ? v.dtes[0].codigo_generacion : v.id}</span></td>
                          <td>${Number(v.subtotal).toFixed(2)}</td>
                          <td>${Number(v.tax_iva).toFixed(2)}</td>
                          <td style={{ fontWeight: 'bold' }}>${Number(v.total).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              )}

              {activeTab === 'CCF' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Comprobante</th>
                      <th>Cliente</th>
                      <th>NRC</th>
                      <th>Gravado</th>
                      <th>IVA (13%)</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasCCF.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center' }}>No hay ventas con crédito fiscal este mes.</td></tr>
                    ) : (
                      ventasCCF.map(v => (
                        <tr key={v.id}>
                          <td>{new Date(v.created_at).toLocaleDateString()}</td>
                          <td><span style={{ fontSize: '11px', opacity: 0.8 }}>{v.dtes && v.dtes.length > 0 ? v.dtes[0].codigo_generacion : v.id}</span></td>
                          <td>{v.clients?.name || '---'}</td>
                          <td>{v.clients?.nrc || '---'}</td>
                          <td>${Number(v.subtotal).toFixed(2)}</td>
                          <td>${Number(v.tax_iva).toFixed(2)}</td>
                          <td style={{ fontWeight: 'bold' }}>${Number(v.total).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </>
              )}

              {activeTab === 'COMPRAS' && (
                <>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Comprobante</th>
                      <th>Proveedor</th>
                      <th>NRC</th>
                      <th>Gravado</th>
                      <th>IVA (13%)</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.length === 0 ? (
                      <tr><td colSpan="7" style={{ textAlign: 'center' }}>No hay compras registradas este mes.</td></tr>
                    ) : (
                      compras.map(c => {
                        const total = Number(c.total);
                        let subtotal = total;
                        let tax_iva = 0;
                        if (c.document_type === 'CCF') {
                          subtotal = total / 1.13;
                          tax_iva = total - subtotal;
                        }
                        
                        return (
                          <tr key={c.id}>
                            <td>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td>{c.document_number || '---'}</td>
                            <td>{c.suppliers?.name || '---'}</td>
                            <td>{c.suppliers?.nrc || '---'}</td>
                            <td>${subtotal.toFixed(2)}</td>
                            <td>${tax_iva.toFixed(2)}</td>
                            <td style={{ fontWeight: 'bold' }}>${total.toFixed(2)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LibrosIva;
