import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { BookOpen, Search } from 'lucide-react';

const LibroDiario = () => {
  const { tenantId } = useTenantStore();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]); // Fecha de hoy

  useEffect(() => {
    if (tenantId) fetchEntries();
  }, [tenantId, dateFilter]);

  const fetchEntries = async () => {
    setLoading(true);
    // Para simplificar, buscamos las partidas de un mes específico o las últimas 50
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        id, entry_date, description, reference_type, reference_id,
        journal_lines ( id, account_id, debit, credit, accounts(code, name) )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (!error && data) {
      setEntries(data);
    }
    setLoading(false);
  };

  const calculateTotal = (lines, type) => {
    return lines.reduce((acc, curr) => acc + Number(curr[type] || 0), 0).toFixed(2);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Libro Diario (Partidas)</h1>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <BookOpen size={24} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Partidas Contables Recientes</h2>
          <div style={{ marginLeft: 'auto' }}>
             <button onClick={fetchEntries} className="glass-button" style={{ padding: '8px 16px', minHeight: 'auto' }}>Refrescar</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando partidas...</div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            No hay partidas registradas aún. Las ventas y compras generarán partidas automáticamente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {entries.map(entry => (
              <div key={entry.id} style={{ 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  padding: '16px', 
                  borderBottom: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.2)',
                  display: 'flex', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{entry.description}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                      Fecha: {new Date(entry.entry_date).toLocaleDateString('es-SV')} | Origen: <span style={{ color: 'var(--primary)' }}>{entry.reference_type}</span>
                    </div>
                  </div>
                </div>
                <div className="table-responsive" style={{ padding: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ padding: '8px 0' }}>Código</th>
                        <th style={{ padding: '8px 0' }}>Cuenta</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}>Debe</th>
                        <th style={{ padding: '8px 0', textAlign: 'right' }}>Haber</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.journal_lines?.map(line => (
                        <tr key={line.id} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px 0', color: 'var(--text-muted)' }}>{line.accounts?.code}</td>
                          <td style={{ padding: '8px 0', paddingLeft: Number(line.credit) > 0 ? '24px' : '0' }}>
                            {line.accounts?.name}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', color: Number(line.debit) > 0 ? '#e2e8f0' : 'transparent' }}>
                            ${Number(line.debit).toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'right', color: Number(line.credit) > 0 ? '#e2e8f0' : 'transparent' }}>
                            ${Number(line.credit).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {/* Totales */}
                      <tr style={{ fontWeight: 600, borderTop: '1px solid var(--border-color)' }}>
                        <td colSpan={2} style={{ padding: '12px 0', textAlign: 'right', color: 'var(--text-muted)' }}>TOTALES</td>
                        <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '3px double var(--border-color)' }}>
                          ${calculateTotal(entry.journal_lines, 'debit')}
                        </td>
                        <td style={{ padding: '12px 0', textAlign: 'right', borderBottom: '3px double var(--border-color)' }}>
                          ${calculateTotal(entry.journal_lines, 'credit')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibroDiario;
