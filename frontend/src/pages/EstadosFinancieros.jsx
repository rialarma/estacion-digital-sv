import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { BarChart2, PieChart, FileText, Calendar, Download } from 'lucide-react';

const getLocalISODate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const getFirstDayOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const EstadosFinancieros = () => {
  const { tenantId } = useTenantStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('resultados'); // resultados, balance, comprobacion
  
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getLocalISODate());
  
  const [accountBalances, setAccountBalances] = useState({});

  useEffect(() => {
    if (tenantId) fetchFinancialData();
  }, [tenantId, startDate, endDate]);

  const fetchFinancialData = async () => {
    setLoading(true);
    
    // Fetch all journal lines in the period
    const { data, error } = await supabase
      .from('journal_lines')
      .select(`
        debit, credit,
        accounts ( id, code, name ),
        journal_entries!inner ( entry_date, tenant_id )
      `)
      .eq('journal_entries.tenant_id', tenantId)
      .gte('journal_entries.entry_date', startDate)
      .lte('journal_entries.entry_date', endDate);

    if (error) {
      console.error("Error fetching financial data:", error);
      setLoading(false);
      return;
    }

    // Process balances
    const balances = {};
    data?.forEach(line => {
      const code = line.accounts?.code;
      if (!code) return;
      
      if (!balances[code]) {
        balances[code] = {
          code: code,
          name: line.accounts.name,
          debit: 0,
          credit: 0
        };
      }
      balances[code].debit += Number(line.debit || 0);
      balances[code].credit += Number(line.credit || 0);
    });

    setAccountBalances(balances);
    setLoading(false);
  };

  // Helper para obtener saldo natural (Deudora vs Acreedora)
  const getNaturalBalance = (account) => {
    const isDeudora = ['1', '5', '6'].includes(account.code.charAt(0));
    if (isDeudora) {
      return account.debit - account.credit;
    } else {
      return account.credit - account.debit;
    }
  };

  const getAccountsByPrefix = (prefix) => {
    return Object.values(accountBalances)
      .filter(a => a.code.startsWith(prefix))
      .sort((a, b) => a.code.localeCompare(b.code));
  };

  const calculateGroupTotal = (accountsArray) => {
    return accountsArray.reduce((acc, curr) => acc + getNaturalBalance(curr), 0);
  };

  // --- ESTADO DE RESULTADOS ---
  const ingresos = getAccountsByPrefix('4');
  const costos = getAccountsByPrefix('5');
  const gastos = getAccountsByPrefix('6');

  const totalIngresos = calculateGroupTotal(ingresos);
  const totalCostos = calculateGroupTotal(costos);
  const utilidadBruta = totalIngresos - totalCostos;
  
  const totalGastos = calculateGroupTotal(gastos);
  const utilidadNeta = utilidadBruta - totalGastos;

  // --- BALANCE GENERAL ---
  const activos = getAccountsByPrefix('1');
  const pasivos = getAccountsByPrefix('2');
  const patrimonio = getAccountsByPrefix('3');

  const totalActivos = calculateGroupTotal(activos);
  const totalPasivos = calculateGroupTotal(pasivos);
  const totalPatrimonioBase = calculateGroupTotal(patrimonio);
  
  // El patrimonio real en este periodo incluye la Utilidad Neta del periodo
  const totalPatrimonioReal = totalPatrimonioBase + utilidadNeta;
  const pasivoYPatrimonio = totalPasivos + totalPatrimonioReal;

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart2 color="var(--primary)" /> Estados Financieros
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Análisis gerencial y reportes contables.</p>
        </div>
        
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--text-muted)" />
            <input 
              type="date" 
              className="glass-input" 
              style={{ padding: '6px' }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <span style={{ color: 'var(--text-muted)' }}>al</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="date" 
              className="glass-input" 
              style={{ padding: '6px' }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '24px', paddingBottom: '16px' }}>
        <button 
          className="glass-button" 
          style={{ background: activeTab === 'resultados' ? 'var(--primary)' : 'transparent', border: activeTab === 'resultados' ? 'none' : '1px solid rgba(255,255,255,0.2)' }}
          onClick={() => setActiveTab('resultados')}
        >
          Estado de Resultados
        </button>
        <button 
          className="glass-button" 
          style={{ background: activeTab === 'balance' ? 'var(--primary)' : 'transparent', border: activeTab === 'balance' ? 'none' : '1px solid rgba(255,255,255,0.2)' }}
          onClick={() => setActiveTab('balance')}
        >
          Balance General
        </button>
        <button 
          className="glass-button" 
          style={{ background: activeTab === 'comprobacion' ? 'var(--primary)' : 'transparent', border: activeTab === 'comprobacion' ? 'none' : '1px solid rgba(255,255,255,0.2)' }}
          onClick={() => setActiveTab('comprobacion')}
        >
          Balanza de Comprobación
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Procesando asientos contables...</div>
      ) : (
        <>
          {/* TAB: ESTADO DE RESULTADOS */}
          {activeTab === 'resultados' && (
            <div className="glass-panel" style={{ padding: '40px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>ESTADO DE RESULTADOS</h2>
                <p style={{ color: 'var(--text-muted)' }}>Del {startDate} al {endDate}</p>
              </div>

              {/* Ingresos */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px', color: '#60a5fa' }}>INGRESOS OPERATIVOS</h3>
                {ingresos.map(acc => (
                  <div key={acc.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
                    <span>{acc.code} - {acc.name}</span>
                    <span>${getNaturalBalance(acc).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold' }}>
                  <span>Total Ingresos</span>
                  <span>${totalIngresos.toFixed(2)}</span>
                </div>
              </div>

              {/* Costos */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px', color: '#f87171' }}>COSTO DE LO VENDIDO</h3>
                {costos.map(acc => (
                  <div key={acc.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
                    <span>{acc.code} - {acc.name}</span>
                    <span>${getNaturalBalance(acc).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold' }}>
                  <span>Total Costos</span>
                  <span>${totalCostos.toFixed(2)}</span>
                </div>
              </div>

              {/* Utilidad Bruta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '24px', fontSize: '18px', fontWeight: 'bold' }}>
                <span>UTILIDAD BRUTA</span>
                <span>${utilidadBruta.toFixed(2)}</span>
              </div>

              {/* Gastos */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '16px', color: '#fb923c' }}>GASTOS OPERATIVOS</h3>
                {gastos.map(acc => (
                  <div key={acc.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
                    <span>{acc.code} - {acc.name}</span>
                    <span>${getNaturalBalance(acc).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold' }}>
                  <span>Total Gastos</span>
                  <span>${totalGastos.toFixed(2)}</span>
                </div>
              </div>

              {/* Utilidad Neta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', background: utilidadNeta >= 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold' }}>
                <span>UTILIDAD NETA DEL PERIODO</span>
                <span style={{ color: utilidadNeta >= 0 ? '#10b981' : '#ef4444' }}>${utilidadNeta.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* TAB: BALANCE GENERAL */}
          {activeTab === 'balance' && (
            <div className="glass-panel" style={{ padding: '40px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>BALANCE GENERAL</h2>
                <p style={{ color: 'var(--text-muted)' }}>Al {endDate}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* Columna Izquierda: Activos */}
                <div>
                  <h3 style={{ borderBottom: '2px solid #60a5fa', paddingBottom: '8px', marginBottom: '16px', color: '#60a5fa' }}>ACTIVOS</h3>
                  {activos.map(acc => (
                    <div key={acc.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
                      <span>{acc.code} - {acc.name}</span>
                      <span>${getNaturalBalance(acc).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px' }}>
                    <span>TOTAL ACTIVOS</span>
                    <span style={{ fontSize: '18px', color: '#60a5fa' }}>${totalActivos.toFixed(2)}</span>
                  </div>
                </div>

                {/* Columna Derecha: Pasivo y Capital */}
                <div>
                  <h3 style={{ borderBottom: '2px solid #f87171', paddingBottom: '8px', marginBottom: '16px', color: '#f87171' }}>PASIVOS</h3>
                  {pasivos.map(acc => (
                    <div key={acc.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
                      <span>{acc.code} - {acc.name}</span>
                      <span>${getNaturalBalance(acc).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px', marginBottom: '24px' }}>
                    <span>TOTAL PASIVOS</span>
                    <span>${totalPasivos.toFixed(2)}</span>
                  </div>

                  <h3 style={{ borderBottom: '2px solid #a855f7', paddingBottom: '8px', marginBottom: '16px', color: '#a855f7' }}>PATRIMONIO</h3>
                  {patrimonio.map(acc => (
                    <div key={acc.code} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--text-muted)' }}>
                      <span>{acc.code} - {acc.name}</span>
                      <span>${getNaturalBalance(acc).toFixed(2)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: utilidadNeta >= 0 ? '#10b981' : '#ef4444' }}>
                    <span>Utilidad Neta del Periodo</span>
                    <span>${utilidadNeta.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '8px' }}>
                    <span>TOTAL PATRIMONIO</span>
                    <span>${totalPatrimonioReal.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginTop: '24px', fontWeight: 'bold' }}>
                    <span>PASIVO + PATRIMONIO</span>
                    <span style={{ fontSize: '18px', color: Math.abs(totalActivos - pasivoYPatrimonio) < 0.01 ? '#10b981' : '#ef4444' }}>
                      ${pasivoYPatrimonio.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BALANZA DE COMPROBACIÓN */}
          {activeTab === 'comprobacion' && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ marginBottom: '24px' }}>Balanza de Comprobación de Movimientos</h3>
              <div className="table-responsive">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Cuenta</th>
                      <th style={{ textAlign: 'right' }}>Total Debe</th>
                      <th style={{ textAlign: 'right' }}>Total Haber</th>
                      <th style={{ textAlign: 'right' }}>Saldo Naturaleza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(accountBalances).sort((a, b) => a.code.localeCompare(b.code)).map(acc => (
                      <tr key={acc.code}>
                        <td>{acc.code}</td>
                        <td>{acc.name}</td>
                        <td style={{ textAlign: 'right', color: acc.debit > 0 ? '#e2e8f0' : 'var(--text-muted)' }}>${acc.debit.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', color: acc.credit > 0 ? '#e2e8f0' : 'var(--text-muted)' }}>${acc.credit.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>${getNaturalBalance(acc).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 'bold', borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                      <td colSpan={2} style={{ textAlign: 'right', padding: '16px 8px' }}>SUMAS IGUALES</td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>
                        ${Object.values(accountBalances).reduce((acc, curr) => acc + curr.debit, 0).toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>
                        ${Object.values(accountBalances).reduce((acc, curr) => acc + curr.credit, 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EstadosFinancieros;
