import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { useAuth } from '../hooks/useAuth';
import { Monitor, Lock, Unlock, DollarSign, Calculator, FileText, ShoppingCart, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const Caja = () => {
  const { tenantId } = useTenantStore();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  
  // States para apertura
  const [openingBalance, setOpeningBalance] = useState('');
  
  // States para cierre
  const [actualBalance, setActualBalance] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [shiftStats, setShiftStats] = useState({ salesTotal: 0, salesCount: 0, cardTotal: 0, transferTotal: 0, returnsTotal: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0, profitMargin: 0 });
  
  // Historial de Cortes
  const [closedShifts, setClosedShifts] = useState([]);

  const fetchState = async () => {
    if (!user) return;
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
      // Calcular ventas y utilidad durante este turno
      const { data: sales } = await supabase
        .from('sales')
        .select('total, payment_method, sale_items(quantity, unit_cost)')
        .eq('shift_id', shift.id);
      
      const efecSales = sales?.filter(s => s.payment_method === 'EFECTIVO').reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const cardSales = sales?.filter(s => s.payment_method === 'TARJETA').reduce((sum, s) => sum + Number(s.total), 0) || 0;
      const transferSales = sales?.filter(s => s.payment_method === 'TRANSFERENCIA').reduce((sum, s) => sum + Number(s.total), 0) || 0;
      
      // Calcular devoluciones durante este turno
      const { data: returns } = await supabase
        .from('returns')
        .select('total_amount')
        .eq('shift_id', shift.id);
        
      const returnsTotal = returns?.reduce((sum, r) => sum + Number(r.total_amount), 0) || 0;

      let totalRevenue = 0;
      let totalCost = 0;

      sales?.forEach(s => {
        totalRevenue += Number(s.total);
        if (s.sale_items) {
          s.sale_items.forEach(item => {
            totalCost += (Number(item.quantity) * Number(item.unit_cost || 0));
          });
        }
      });

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

      setShiftStats({
        salesTotal: efecSales,
        salesCount: sales?.length || 0,
        cardTotal: cardSales,
        transferTotal: transferSales,
        returnsTotal: returnsTotal,
        totalRevenue,
        totalCost,
        totalProfit,
        profitMargin
      });
    }

    // Fetch Closed Shifts History
    const { data: history } = await supabase
      .from('cash_shifts')
      .select(`
        *,
        user_profiles!cash_shifts_cashier_id_fkey(first_name, last_name)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'CLOSED')
      .order('closed_at', { ascending: false })
      .limit(10);
      
    if (history) setClosedShifts(history);

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
      navigate('/ventas');
    } catch (error) {
      alert("Error abriendo caja: " + error.message);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!activeShift) return;
    
    // El efectivo esperado es (Fondo Inicial + Ventas Efectivo - Devoluciones Efectivo)
    const expected = Number(activeShift.opening_balance) + shiftStats.salesTotal - shiftStats.returnsTotal;
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
      <PageHeader title="Gestión de Caja (Turno)" icon={Monitor}>
        {activeShift && (
          <button onClick={() => navigate('/ventas')} className="glass-button" style={{ background: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={16} /> Ir a Ventas
          </button>
        )}
      </PageHeader>

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
              
              {shiftStats.returnsTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Devoluciones</span>
                  <span style={{ fontWeight: 'bold', color: '#ef4444' }}>- ${shiftStats.returnsTotal.toFixed(2)}</span>
                </div>
              )}
              
              {(shiftStats.cardTotal > 0 || shiftStats.transferTotal > 0) && (
                <div style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '13px' }}>
                  <div style={{ marginBottom: '4px', color: 'var(--text-muted)' }}>Ingresos No Físicos (Banco):</div>
                  {shiftStats.cardTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tarjetas</span>
                      <span style={{ color: '#eab308' }}>${shiftStats.cardTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {shiftStats.transferTotal > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Transferencias</span>
                      <span style={{ color: '#a855f7' }}>${shiftStats.transferTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginTop: '10px' }}>
                <span style={{ paddingLeft: '12px' }}>Efectivo Esperado</span>
                <span style={{ paddingRight: '12px', fontWeight: 'bold', fontSize: '20px', color: '#3b82f6' }}>
                  ${(Number(activeShift.opening_balance) + shiftStats.salesTotal - shiftStats.returnsTotal).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Rendimiento (Utilidad) del turno - Solo para Administradores */}
            {profile?.role === 'ADMIN' && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', color: '#60a5fa' }}>
                  <PieChart size={16} /> Rendimiento de Ventas (Todas las formas de pago)
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Venta Total (Ingresos)</span>
                    <span style={{ fontWeight: 'bold' }}>${shiftStats.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Costo de los Productos</span>
                    <span style={{ fontWeight: 'bold', color: '#ef4444' }}>- ${shiftStats.totalCost.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '6px' }}>
                    <span style={{ color: '#4ade80', fontWeight: 'bold' }}>Utilidad Libre (Ganancia)</span>
                    <span style={{ fontWeight: 'bold', color: '#4ade80' }}>${shiftStats.totalProfit.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Margen Neto %</span>
                    <span style={{ fontWeight: 'bold' }}>{shiftStats.profitMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}
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

      {/* Historial de Cortes Z */}
      <div className="glass-panel" style={{ padding: '24px', marginTop: '40px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <FileText size={20} color="var(--primary)" /> Historial de Cortes Z (Últimos 10)
        </h3>
        
        {closedShifts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay cortes registrados aún.</p>
        ) : (
          <div className="table-responsive">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Fecha de Cierre</th>
                  <th>Cajero</th>
                  <th>Apertura</th>
                  <th>Esperado</th>
                  <th>Reportado</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {closedShifts.map(shift => (
                  <tr key={shift.id}>
                    <td>{new Date(shift.closed_at).toLocaleString()}</td>
                    <td>{shift.user_profiles?.first_name} {shift.user_profiles?.last_name}</td>
                    <td>${Number(shift.opening_balance).toFixed(2)}</td>
                    <td>${Number(shift.expected_balance).toFixed(2)}</td>
                    <td>${Number(shift.actual_balance).toFixed(2)}</td>
                    <td style={{ 
                      color: Number(shift.difference) < 0 ? '#ef4444' : '#10b981',
                      fontWeight: 'bold'
                    }}>
                      {Number(shift.difference) > 0 ? '+' : ''}{Number(shift.difference).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Caja;
