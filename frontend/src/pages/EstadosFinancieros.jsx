import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { PieChart, DollarSign, TrendingUp } from 'lucide-react';

const EstadosFinancieros = () => {
  const { tenantId } = useTenantStore();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({});
  const [accounts, setAccounts] = useState([]);
  
  // Totales
  const [totalActivo, setTotalActivo] = useState(0);
  const [totalPasivo, setTotalPasivo] = useState(0);
  const [totalPatrimonio, setTotalPatrimonio] = useState(0);
  
  const [totalIngresos, setTotalIngresos] = useState(0);
  const [totalCostos, setTotalCostos] = useState(0);
  const [totalGastos, setTotalGastos] = useState(0);

  useEffect(() => {
    if (tenantId) fetchFinancials();
  }, [tenantId]);

  const fetchFinancials = async () => {
    setLoading(true);
    // 1. Obtener todas las cuentas
    const { data: accData } = await supabase.from('accounts').select('*').eq('tenant_id', tenantId);
    
    // 2. Obtener todas las líneas de partidas para calcular los saldos actuales
    const { data: linesData } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, journal_entries!inner(tenant_id)')
      .eq('journal_entries.tenant_id', tenantId);

    if (accData && linesData) {
      setAccounts(accData);
      
      // 3. Sumarizar saldos por cuenta
      const saldos = {}; // { account_id: balance }
      
      accData.forEach(acc => { saldos[acc.id] = 0; });

      linesData.forEach(line => {
        const acc = accData.find(a => a.id === line.account_id);
        if (acc) {
          const deb = Number(line.debit || 0);
          const cred = Number(line.credit || 0);
          
          if (acc.nature === 'deudora') {
            saldos[acc.id] += (deb - cred);
          } else {
            saldos[acc.id] += (cred - deb);
          }
        }
      });

      setBalances(saldos);

      // 4. Calcular totales por tipo
      let act = 0, pas = 0, pat = 0, ing = 0, cos = 0, gas = 0;

      accData.forEach(acc => {
        if (!acc.is_group) {
          const bal = saldos[acc.id] || 0;
          if (acc.type === 'Activo') act += bal;
          if (acc.type === 'Pasivo') pas += bal;
          if (acc.type === 'Patrimonio') pat += bal;
          if (acc.type === 'Ingreso') ing += bal;
          if (acc.type === 'Costo') cos += bal;
          if (acc.type === 'Gasto') gas += bal;
        }
      });

      setTotalActivo(act);
      setTotalPasivo(pas);
      setTotalIngresos(ing);
      setTotalCostos(cos);
      setTotalGastos(gas);
      
      // La Utilidad del Ejercicio se suma al Patrimonio en el Balance
      const utilidad = ing - cos - gas;
      setTotalPatrimonio(pat + utilidad);
    }
    setLoading(false);
  };

  const utilidad = totalIngresos - totalCostos - totalGastos;

  const renderAccountGroup = (type, accountsList) => {
    const filtered = accountsList.filter(a => a.type === type && !a.is_group);
    if (filtered.length === 0) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>{type}</h4>
        <table style={{ width: '100%', fontSize: '14px' }}>
          <tbody>
            {filtered.map(acc => {
              const bal = balances[acc.id] || 0;
              if (bal === 0) return null; // Ocultar cuentas a cero para limpieza visual
              return (
                <tr key={acc.id}>
                  <td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>{acc.code}</td>
                  <td style={{ padding: '6px 0' }}>{acc.name}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 500 }}>${bal.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Estados Financieros</h1>
        <button onClick={fetchFinancials} className="glass-button">Refrescar</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Calculando Estados Financieros...</div>
      ) : (
        <div style={{ display: 'grid', gap: '24px' }}>
          
          {/* Tarjetas de Resumen */}
          <div className="grid-1-1-1">
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '14px' }}>Activo Total</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>${totalActivo.toFixed(2)}</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '14px' }}>Pasivo Total</div>
              <div style={{ fontSize: '28px', fontWeight: 700 }}>${totalPasivo.toFixed(2)}</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '14px' }}>Utilidad del Ejercicio</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: utilidad >= 0 ? '#4ade80' : '#f87171' }}>
                ${utilidad.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid-1-1">
            {/* Estado de Resultados */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <TrendingUp color="var(--primary)" />
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Estado de Resultados</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>Del Ejercicio Actual</p>
              
              {renderAccountGroup('Ingreso', accounts)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Total Ingresos</span><span>${totalIngresos.toFixed(2)}</span>
              </div>

              <div style={{ marginTop: '24px' }}></div>
              {renderAccountGroup('Costo', accounts)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Total Costos</span><span>${totalCostos.toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, padding: '12px 0', color: 'var(--primary)', marginTop: '8px' }}>
                <span>Utilidad Bruta</span><span>${(totalIngresos - totalCostos).toFixed(2)}</span>
              </div>

              <div style={{ marginTop: '24px' }}></div>
              {renderAccountGroup('Gasto', accounts)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Total Gastos</span><span>${totalGastos.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '18px', padding: '16px 0', borderTop: '2px solid var(--primary)', marginTop: '16px' }}>
                <span>UTILIDAD NETA</span>
                <span style={{ color: utilidad >= 0 ? '#4ade80' : '#f87171' }}>${utilidad.toFixed(2)}</span>
              </div>
            </div>

            {/* Balance General */}
            <div className="glass-panel" style={{ padding: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <PieChart color="var(--primary)" />
                <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Balance General</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px' }}>Al día de hoy</p>
              
              {renderAccountGroup('Activo', accounts)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, padding: '12px 0', borderTop: '2px solid var(--primary)' }}>
                <span>TOTAL ACTIVO</span><span>${totalActivo.toFixed(2)}</span>
              </div>

              <div style={{ marginTop: '40px' }}></div>
              
              {renderAccountGroup('Pasivo', accounts)}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Total Pasivo</span><span>${totalPasivo.toFixed(2)}</span>
              </div>

              <div style={{ marginTop: '24px' }}></div>
              {renderAccountGroup('Patrimonio', accounts)}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', color: 'var(--text-muted)' }}>
                <span>Utilidad del Ejercicio</span><span style={{ fontWeight: 500 }}>${utilidad.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Total Patrimonio</span><span>${totalPatrimonio.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '18px', padding: '16px 0', borderTop: '2px solid var(--primary)', marginTop: '16px' }}>
                <span>TOTAL PASIVO + PATRIMONIO</span>
                <span>${(totalPasivo + totalPatrimonio).toFixed(2)}</span>
              </div>
              
              {/* Ecuación contable check */}
              {Math.abs(totalActivo - (totalPasivo + totalPatrimonio)) > 0.01 && (
                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(248,113,113,0.1)', color: '#f87171', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
                  Advertencia: El balance no cuadra. Diferencia: ${(totalActivo - (totalPasivo + totalPatrimonio)).toFixed(2)}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default EstadosFinancieros;
