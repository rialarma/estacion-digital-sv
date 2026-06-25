import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { BookOpen, Search, Plus, Save, X, Trash2 } from 'lucide-react';

const getLocalISODate = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
};

const formatLocalDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

const LibroDiario = () => {
  const { tenantId } = useTenantStore();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(getLocalISODate()); // Fecha de hoy
  
  // Manual Entry State
  const [showModal, setShowModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [manualDate, setManualDate] = useState(getLocalISODate());
  const [manualDesc, setManualDesc] = useState('');
  const [manualLines, setManualLines] = useState([
    { account_id: '', debit: '', credit: '' },
    { account_id: '', debit: '', credit: '' }
  ]);

  useEffect(() => {
    if (tenantId) {
      fetchEntries();
      fetchAccounts();
    }
  }, [tenantId, dateFilter]);

  const fetchAccounts = async () => {
    const { data } = await supabase.from('accounts').select('id, code, name').eq('tenant_id', tenantId).order('code');
    if (data) setAccounts(data);
  };

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

  // Manual Entry Logic
  const addLine = () => setManualLines([...manualLines, { account_id: '', debit: '', credit: '' }]);
  const removeLine = (index) => setManualLines(manualLines.filter((_, i) => i !== index));
  
  const updateLine = (index, field, value) => {
    const newLines = [...manualLines];
    if (field === 'debit' && value > 0) newLines[index].credit = '';
    if (field === 'credit' && value > 0) newLines[index].debit = '';
    newLines[index][field] = value;
    setManualLines(newLines);
  };

  const totalDebit = manualLines.reduce((acc, curr) => acc + Number(curr.debit || 0), 0);
  const totalCredit = manualLines.reduce((acc, curr) => acc + Number(curr.credit || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && difference === 0;

  const handleSaveManualEntry = async () => {
    if (!isBalanced) return alert('La partida no cuadra.');
    if (!manualDesc) return alert('Ingresa un concepto.');
    
    const validLines = manualLines.filter(l => l.account_id && (Number(l.debit) > 0 || Number(l.credit) > 0));
    if (validLines.length < 2) return alert('Debes incluir al menos dos cuentas con valores.');

    setSaving(true);
    try {
      const { data: entry, error: entryErr } = await supabase
        .from('journal_entries')
        .insert([{
          tenant_id: tenantId,
          entry_date: manualDate,
          description: manualDesc,
          reference_type: 'MANUAL',
          reference_id: null
        }]).select().single();
      
      if (entryErr) throw entryErr;

      const linesData = validLines.map(l => ({
        tenant_id: tenantId,
        entry_id: entry.id,
        account_id: l.account_id,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0)
      }));

      const { error: linesErr } = await supabase.from('journal_lines').insert(linesData);
      if (linesErr) throw linesErr;

      setShowModal(false);
      setManualDesc('');
      setManualLines([{ account_id: '', debit: '', credit: '' }, { account_id: '', debit: '', credit: '' }]);
      fetchEntries();
    } catch (err) {
      alert('Error guardando partida: ' + err.message);
    } finally {
      setSaving(false);
    }
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
             <button onClick={() => setShowModal(true)} className="glass-button" style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', minHeight: 'auto' }}>
               <Plus size={16} /> Nueva Partida
             </button>
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
                      Fecha: {formatLocalDate(entry.entry_date)} | Origen: <span style={{ color: 'var(--primary)' }}>{entry.reference_type}</span>
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

      {/* MODAL PARTIDA MANUAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ padding: '32px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}><BookOpen size={24} /> Nueva Partida Manual</h2>
              <button onClick={() => setShowModal(false)} className="glass-button" style={{ padding: '8px' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Fecha</label>
                <input type="date" className="glass-input" value={manualDate} onChange={e => setManualDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Concepto (Descripción)</label>
                <input type="text" className="glass-input" placeholder="Ej. Depreciación mensual..." value={manualDesc} onChange={e => setManualDesc(e.target.value)} required />
              </div>
            </div>

            <table className="glass-table" style={{ marginBottom: '16px' }}>
              <thead>
                <tr>
                  <th>Cuenta Contable</th>
                  <th style={{ width: '120px' }}>Debe ($)</th>
                  <th style={{ width: '120px' }}>Haber ($)</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {manualLines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      <select className="glass-input" style={{ padding: '8px' }} value={line.account_id} onChange={e => updateLine(index, 'account_id', e.target.value)}>
                        <option value="">-- Seleccionar Cuenta --</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" className="glass-input" style={{ padding: '8px' }} value={line.debit} onChange={e => updateLine(index, 'debit', e.target.value)} />
                    </td>
                    <td>
                      <input type="number" min="0" step="0.01" className="glass-input" style={{ padding: '8px' }} value={line.credit} onChange={e => updateLine(index, 'credit', e.target.value)} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => removeLine(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <button onClick={addLine} className="glass-button" style={{ fontSize: '13px', padding: '6px 12px', marginBottom: '32px' }}>
              <Plus size={14} /> Añadir línea
            </button>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sumas Iguales</div>
                <div style={{ display: 'flex', gap: '32px', marginTop: '8px' }}>
                  <div>Debe: <strong style={{ color: totalDebit === totalCredit && totalDebit > 0 ? '#10b981' : 'white', fontSize: '18px' }}>${totalDebit.toFixed(2)}</strong></div>
                  <div>Haber: <strong style={{ color: totalDebit === totalCredit && totalDebit > 0 ? '#10b981' : 'white', fontSize: '18px' }}>${totalCredit.toFixed(2)}</strong></div>
                </div>
                {!isBalanced && totalDebit > 0 && (
                  <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', fontWeight: 'bold' }}>
                    Diferencia de: ${difference.toFixed(2)} (La partida no cuadra)
                  </div>
                )}
              </div>
              <button 
                onClick={handleSaveManualEntry} 
                className="glass-button" 
                disabled={!isBalanced || saving}
                style={{ background: isBalanced ? '#10b981' : 'rgba(255,255,255,0.1)', color: 'white', padding: '12px 24px' }}
              >
                <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Partida'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibroDiario;
