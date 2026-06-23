import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { useAuth } from '../hooks/useAuth';
import { Monitor, Lock, Unlock, DollarSign, Calculator, FileText } from 'lucide-react';

const Caja = () => {
  const { tenantId } = useTenantStore();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  
  // States para apertura
  const [openingBalance, setOpeningBalance] = useState('');
  
  // States para cierre
  const [actualBalance, setActualBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [shiftStats, setShiftStats] = useState({ salesTotal: 0, salesCount: 0 });

  const fetchState = async () => {
    if (!tenantId || !user) return;
    setLoading(true);

    const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    const { data: shift } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('cashier_id', user.id)
      .eq('status', 'OPEN')
      .single();

    setActiveShift(shift || null);

    if (shift) {
      // Calcular ventas durante este turno
      const { data: sales } = await supabase
        .from('sales')
        .select('total, payment_method')
        .eq('shift_id', shift.id);
      
      const efecSales = sales?.filter(s => s.payment_method === 'EFECTIVO').reduce((sum, s) => sum + Number(s.total), 0) || 0;
      setShiftStats({
        salesTotal: efecSales,
        salesCount: sales?.length || 0
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchState();
  }, [tenantId, user]);

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('cash_shifts').insert([{
        tenant_id: tenantId,
        branch_id: profile.branch_id,
        cashier_id: user.id,
        opening_balance: parseFloat(openingBalance || 0),
        status: 'OPEN'
      }]);
      if (error) throw error;
      setOpeningBalance('');
      fetchState();
    } catch (error) {
      alert("Error abriendo caja: " + error.message);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!activeShift) return;
    
    const expected = Number(activeShift.opening_balance) + shiftStats.salesTotal;
    const actual = parseFloat(actualBalance || 0);
    const diff = actual - expected;

    try {
      const { error } = await supabase.from('cash_shifts').update({
        closed_at: new Date().toISOString(),
        expected_balance: expected,
        actual_balance: actual,
        difference: diff,
        notes: closingNotes,
        status: 'CLOSED'
      }).eq('id', activeShift.id);

      if (error) throw error;
      setActualBalance('');
      setClosingNotes('');
      fetchState();
      alert(`Turno cerrado exitosamente. Diferencia: $${diff.toFixed(2)}`);
    } catch (error) {
      alert("Error cerrando caja: " + error.message);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando estado de caja...</div>;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Monitor size={32} color="var(--primary)" />
        <h1 className="page-title">Gestión de Caja (Turno)</h1>
      </div>

      {!activeShift ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginTop: '20px' }}>
          <Unlock size={64} style={{ color: '#10b981', margin: '0 auto 20px' }} />
          <h2>Apertura de Caja</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Ingresa el monto de efectivo con el que inicias tu turno (Fondo de Cambio).</p>
          
          <form onSubmit={handleOpenShift} style={{ maxWidth: '300px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <DollarSign size={20} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className="glass-input"
                placeholder="0.00"
                style={{ paddingLeft: '40px', fontSize: '24px', textAlign: 'center' }}
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
              />
            </div>
            <button type="submit" className="glass-button" style={{ background: '#10b981', width: '100%', padding: '12px', fontSize: '16px' }}>
              Abrir Turno
            </button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '20px' }}>
          {/* Stats del Turno */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <FileText size={20} color="var(--primary)" /> Resumen del Turno
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Monto Inicial (Apertura)</span>
                <span style={{ fontWeight: 'bold' }}>${Number(activeShift.opening_balance).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Ventas en Efectivo</span>
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>+ ${shiftStats.salesTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginTop: '10px' }}>
                <span style={{ paddingLeft: '12px', fontWeight: 'bold' }}>Efectivo Esperado</span>
                <span style={{ paddingRight: '12px', fontWeight: 'bold', fontSize: '20px', color: '#60a5fa' }}>
                  ${(Number(activeShift.opening_balance) + shiftStats.salesTotal).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Cierre de Turno */}
          <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: '#f87171' }}>
              <Lock size={20} /> Cierre de Caja
            </h3>
            
            <form onSubmit={handleCloseShift} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Efectivo Físico Contado (En gaveta)
                </label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="glass-input"
                    placeholder="0.00"
                    style={{ paddingLeft: '40px', fontSize: '18px' }}
                    value={actualBalance}
                    onChange={e => setActualBalance(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Notas o Justificaciones (Opcional)
                </label>
                <textarea
                  className="glass-input"
                  placeholder="Justifique sobrantes o faltantes..."
                  rows="3"
                  value={closingNotes}
                  onChange={e => setClosingNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="glass-button" style={{ background: '#ef4444', marginTop: '10px' }}>
                Declarar Cierre (Corte Z)
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caja;
