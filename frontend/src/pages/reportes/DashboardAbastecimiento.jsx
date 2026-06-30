import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { ShoppingCart, Truck, Calendar, ArrowRight, Printer } from 'lucide-react';

const DashboardAbastecimiento = ({ tenantId }) => {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');

  useEffect(() => {
    if (tenantId) {
      fetchAbastecimientoData();
    }
  }, [tenantId]);

  const fetchAbastecimientoData = async () => {
    setLoading(true);
    try {
      // 1. Obtener la fecha de hace 90 días (3 meses) para sacar el promedio
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const dateString = ninetyDaysAgo.toISOString();

      // 2. Traer todas las ventas de esos 90 días
      const { data: salesData, error: salesError } = await supabase
        .from('sale_items')
        .select(`
          quantity,
          product_id,
          sales!inner ( created_at, tenant_id )
        `)
        .eq('sales.tenant_id', tenantId)
        .gte('sales.created_at', dateString);

      if (salesError) throw salesError;

      // Agrupar ventas por producto
      const salesCount = {};
      salesData?.forEach(item => {
        if (!salesCount[item.product_id]) salesCount[item.product_id] = 0;
        salesCount[item.product_id] += Number(item.quantity || 0);
      });

      // 3. Traer el inventario físico real y los datos del producto (incluyendo su proveedor)
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select(`
          stock, 
          product_id, 
          products ( id, name, cost, supplier_id )
        `)
        .eq('tenant_id', tenantId);

      if (invError) throw invError;

      // 4. Traer lista de proveedores para el filtro
      const { data: suppData } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .order('name');
        
      if (suppData) setSuppliers(suppData);

      const suppMap = {};
      suppData?.forEach(s => suppMap[s.id] = s.name);

      // 5. Unir los datos para crear la Sugerencia
      const report = [];
      invData?.forEach(item => {
        const prod = item.products;
        if (!prod) return;

        const soldLast90Days = salesCount[prod.id] || 0;
        const monthlyAverage = soldLast90Days / 3; // Promedio mensual
        
        // Política de Abastecimiento: Queremos tener stock para cubrir 1.5 meses de ventas
        const targetStock = Math.ceil(monthlyAverage * 1.5);
        const currentStock = Number(item.stock || 0);
        
        // Si el inventario físico es menor que nuestro Target, necesitamos pedir
        let suggestOrderQty = targetStock - currentStock;
        if (suggestOrderQty < 0) suggestOrderQty = 0;

        report.push({
          productId: prod.id,
          productName: prod.name,
          cost: Number(prod.cost || 0),
          supplierId: prod.supplier_id || 'SIN_PROVEEDOR',
          supplierName: prod.supplier_id ? suppMap[prod.supplier_id] : 'Sin Proveedor Asignado',
          currentStock,
          monthlyAverage,
          suggestOrderQty,
          suggestOrderValue: suggestOrderQty * Number(prod.cost || 0)
        });
      });

      // Ordenar por proveedor, y luego por cantidad a pedir descendente
      report.sort((a, b) => {
        if (a.supplierName < b.supplierName) return -1;
        if (a.supplierName > b.supplierName) return 1;
        return b.suggestOrderQty - a.suggestOrderQty;
      });

      setReportData(report);
    } catch (error) {
      console.error('Error fetching abastecimiento:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => `$${Number(val).toFixed(2)}`;

  const filteredData = selectedSupplier === 'ALL' 
    ? reportData 
    : reportData.filter(d => d.supplierId === selectedSupplier);

  // Solo mostrar productos que realmente necesitan pedirse
  const dataToOrder = filteredData.filter(d => d.suggestOrderQty > 0);
  const dataHealthy = filteredData.filter(d => d.suggestOrderQty === 0);

  const totalToInvest = dataToOrder.reduce((acc, item) => acc + item.suggestOrderValue, 0);

  const handlePrintOrder = () => {
    window.print();
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Analizando el historial de ventas para generar proyecciones...</div>;

  return (
    <div className="print-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart style={{ color: 'var(--primary)' }} /> Proyección de Compras
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0 0' }}>
            Basado en tu promedio de ventas de los últimos 3 meses, esto es lo que necesitas pedir para no quedarte sin stock.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }} className="no-print">
          <select className="glass-input" style={{ width: '250px' }} value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}>
            <option value="ALL">Todos los Proveedores</option>
            <option value="SIN_PROVEEDOR">Sin Proveedor Asignado</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <button className="glass-button" onClick={handlePrintOrder}>
            <Printer size={18} /> Imprimir Orden
          </button>
        </div>
      </div>

      {/* Resumen Superior */}
      <div className="glass-panel no-print" style={{ padding: '24px', marginBottom: '24px', display: 'flex', gap: '24px', alignItems: 'center', background: 'rgba(59, 130, 246, 0.05)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Inversión Sugerida para Abastecimiento</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--primary)' }}>{formatCurrency(totalToInvest)}</div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Productos a pedir</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)' }}>{dataToOrder.length}</div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Productos sanos (Sin pedir)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{dataHealthy.length}</div>
        </div>
      </div>

      {/* Tabla de Sugerencia de Pedidos */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Lista de Productos a Pedir
        </h3>
        
        {dataToOrder.length > 0 ? (
          <table className="glass-table">
            <thead>
              <tr>
                {selectedSupplier === 'ALL' && <th>Proveedor</th>}
                <th>Producto</th>
                <th>Stock Actual</th>
                <th>Promedio Venta /mes</th>
                <th style={{ color: '#f59e0b' }}>Sugerencia a Pedir</th>
                <th>Costo Total Pedido</th>
              </tr>
            </thead>
            <tbody>
              {dataToOrder.map((item, idx) => (
                <tr key={idx} style={{ background: item.suggestOrderQty > item.currentStock * 2 ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                  {selectedSupplier === 'ALL' && (
                    <td>
                      <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                        {item.supplierName}
                      </span>
                    </td>
                  )}
                  <td style={{ fontWeight: 500 }}>{item.productName}</td>
                  <td>
                    <span style={{ color: item.currentStock === 0 ? '#ef4444' : 'var(--text-main)', fontWeight: item.currentStock === 0 ? 'bold' : 'normal' }}>
                      {item.currentStock}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{item.monthlyAverage.toFixed(1)} unds</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 'bold', fontSize: '16px' }}>
                      <ArrowRight size={14} />
                      {item.suggestOrderQty}
                    </div>
                  </td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(item.suggestOrderValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#10b981' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Truck size={24} />
            </div>
            Excelente. Tienes suficiente stock para cubrir tus ventas. No necesitas pedirle nada a este proveedor.
          </div>
        )}
      </div>

    </div>
  );
};

export default DashboardAbastecimiento;
