import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { FileText, Download, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';

export default function ReporteVentasDiarias({ tenantId, isoStart, isoEnd }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ ingresos: 0, costo: 0, ganancia: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: sales, error } = await supabase
          .from('sales')
          .select('created_at, total, sale_items(quantity, unit_cost)')
          .eq('tenant_id', tenantId)
          .gte('created_at', isoStart)
          .lte('created_at', isoEnd)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const daily = {};
        let tIngresos = 0;
        let tCosto = 0;
        let tGanancia = 0;

        sales?.forEach(sale => {
          const dateObj = new Date(sale.created_at);
          // Format as DD/MM/YYYY
          const dateStr = dateObj.toLocaleDateString('es-SV', { year: 'numeric', month: '2-digit', day: '2-digit' });
          
          if (!daily[dateStr]) {
            daily[dateStr] = { fecha: dateStr, ingresos: 0, costo: 0, ganancia: 0, rawDate: dateObj };
          }

          const saleTotal = Number(sale.total);
          let saleCost = 0;
          sale.sale_items?.forEach(item => {
            saleCost += (Number(item.quantity) * Number(item.unit_cost || 0));
          });
          const saleProfit = saleTotal - saleCost;

          daily[dateStr].ingresos += saleTotal;
          daily[dateStr].costo += saleCost;
          daily[dateStr].ganancia += saleProfit;

          tIngresos += saleTotal;
          tCosto += saleCost;
          tGanancia += saleProfit;
        });

        // Convert to array and sort by date descending for the table
        const rows = Object.values(daily).sort((a, b) => b.rawDate - a.rawDate);

        // For the chart, we want chronological order (ascending)
        const chartRows = [...rows].reverse();

        setData(rows);
        // We will attach chartData to state as well
        setTotals({ ingresos: tIngresos, costo: tCosto, ganancia: tGanancia, chartData: chartRows });
      } catch (err) {
        console.error("Error cargando reporte:", err);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId && isoStart && isoEnd) {
      fetchData();
    }
  }, [tenantId, isoStart, isoEnd]);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando reporte de ventas...</div>;

  return (
    <div className="glass-panel" style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <FileText size={20} color="var(--primary)" /> 
          Reporte de Ventas Diarias
        </h3>
        <button 
          className="glass-button" 
          onClick={() => window.print()} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <Download size={16} /> Exportar / Imprimir
        </button>
      </div>

      {totals.chartData && totals.chartData.length > 0 && (
        <div style={{ height: '300px', marginBottom: '32px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
            <TrendingUp size={16} /> Tendencia del Período
          </h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={totals.chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="fecha" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip 
                contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                itemStyle={{ fontWeight: 'bold' }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`]}
              />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="ingresos" name="Ingresos (Ventas)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="ganancia" name="Utilidad (Ganancia)" stroke="#4ade80" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 8px' }}>Fecha</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Ventas (Ingresos)</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Costo Total</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Utilidad (Ganancia)</th>
              <th style={{ padding: '12px 8px', textAlign: 'right' }}>Margen Neto</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No hay ventas en este período.</td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const margen = row.ingresos > 0 ? (row.ganancia / row.ingresos) * 100 : 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{row.fecha}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>${row.ingresos.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#ef4444' }}>-${row.costo.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>${row.ganancia.toFixed(2)}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>{margen.toFixed(1)}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                <td style={{ padding: '16px 8px' }}>TOTAL PERÍODO</td>
                <td style={{ padding: '16px 8px', textAlign: 'right' }}>${totals.ingresos.toFixed(2)}</td>
                <td style={{ padding: '16px 8px', textAlign: 'right', color: '#ef4444' }}>-${totals.costo.toFixed(2)}</td>
                <td style={{ padding: '16px 8px', textAlign: 'right', color: '#4ade80' }}>${totals.ganancia.toFixed(2)}</td>
                <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                  {totals.ingresos > 0 ? ((totals.ganancia / totals.ingresos) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
