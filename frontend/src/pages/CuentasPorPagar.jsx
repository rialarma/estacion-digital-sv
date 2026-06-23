import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, DollarSign, Calendar, Truck, FileText, CheckCircle, ChevronRight, X } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

const CuentasPorPagar = () => {
  const { tenantId } = useTenantStore();
  const [debts, setDebts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'TRANSFERENCIA', reference: '' });
  const [saving, setSaving] = useState(false);

  const fetchDebts = async () => {
    if (!tenantId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('user_profiles').select('branch_id').eq('id', user.id).single();

    let query = supabase
      .from('purchases')
      .select(`
        id, created_at, total, balance, payment_method, document_number,
        suppliers ( name )
      `)
      .eq('tenant_id', tenantId)
      .gt('balance', 0)
      .order('created_at', { ascending: false });

    if (profile && profile.branch_id) {
      query = query.eq('branch_id', profile.branch_id);
    }

    const { data, error } = await query;
    if (!error && data) setDebts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDebts();
  }, [tenantId]);

  const filteredDebts = debts.filter(d => 
    d.suppliers?.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.document_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  const openPaymentModal = (debt) => {
    setSelectedDebt(debt);
    setPaymentForm({ amount: debt.balance.toFixed(2), method: 'TRANSFERENCIA', reference: '' });
    setShowModal(true);
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    if (!selectedDebt) return;
    
    const amountToPay = parseFloat(paymentForm.amount);
    if (amountToPay <= 0 || amountToPay > selectedDebt.balance) {
      alert('El monto a abonar debe ser mayor a 0 y menor o igual al saldo pendiente.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id, branch_id').eq('id', user.id).single();

      // 1. Registrar el pago
      const { error: paymentError } = await supabase.from('cxp_payments').insert([{
        tenant_id: profile.tenant_id,
        branch_id: profile.branch_id || selectedDebt.branch_id,
        purchase_id: selectedDebt.id,
        amount: amountToPay,
        payment_method: paymentForm.method,
        reference_number: paymentForm.reference,
        created_by: user.id
      }]);

      if (paymentError) throw paymentError;

      // 2. Descontar el balance de la compra
      const newBalance = parseFloat((selectedDebt.balance - amountToPay).toFixed(2));
      const { error: updateError } = await supabase.from('purchases')
        .update({ balance: newBalance })
        .eq('id', selectedDebt.id);

      if (updateError) throw updateError;

      alert(`✅ Pago a proveedor de $${amountToPay.toFixed(2)} registrado exitosamente.`);
      setShowModal(false);
      fetchDebts();
    } catch (err) {
      alert('Error al registrar pago: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Cuentas por Pagar (Proveedores)</h1>
        <div style={{ display: 'flex', gap: '16px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px 20px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deuda Total a Proveedores</span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>
              ${debts.reduce((sum, d) => sum + (Number(d.balance) || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="glass-input"
            placeholder="Buscar por proveedor o documento..."
            style={{ paddingLeft: '40px' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando cuentas...</div>
        ) : filteredDebts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 16px', color: '#10b981', opacity: 0.8 }} />
            <p style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>¡Todo al día!</p>
            <p>No tienes cuentas pendientes por pagar a proveedores.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Fecha de Compra</th>
                  <th>Proveedor</th>
                  <th>Doc. Referencia</th>
                  <th>Total Original</th>
                  <th>Saldo Pendiente</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDebts.map(debt => (
                  <tr key={debt.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                        {new Date(debt.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                        <Truck size={14} style={{ color: 'var(--text-muted)' }} />
                        {debt.suppliers?.name || 'Proveedor Genérico'}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {debt.document_number || debt.id.substring(0, 8)}
                    </td>
                    <td>${Number(debt.total).toFixed(2)}</td>
                    <td style={{ color: '#f87171', fontWeight: 'bold' }}>
                      ${Number(debt.balance).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        className="glass-button" 
                        style={{ padding: '6px 12px', fontSize: '13px', margin: '0 auto' }}
                        onClick={() => openPaymentModal(debt)}
                      >
                        <DollarSign size={14} /> Pagar Cuota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && selectedDebt && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DollarSign size={20} color="#f87171" /> 
                Registrar Pago a Proveedor
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Proveedor: <strong>{selectedDebt.suppliers?.name || 'Genérico'}</strong></p>
              <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-muted)' }}>Saldo actual: <strong style={{ color: '#f87171', fontSize: '16px' }}>${Number(selectedDebt.balance).toFixed(2)}</strong></p>
            </div>

            <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: 'var(--text-muted)' }}>Monto a Pagar ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={selectedDebt.balance}
                  className="glass-input"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  style={{ fontSize: '18px', fontWeight: 'bold' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: 'var(--text-muted)' }}>Método de Pago</label>
                <select 
                  className="glass-input"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                  required
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: 'var(--text-muted)' }}>Número de Referencia (Opcional)</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Ej. Cheque #123, Ref #89283"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="glass-button" style={{ background: 'var(--bg-card)', flex: 1, border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="glass-button" style={{ background: '#f87171', flex: 1 }} disabled={saving}>
                  {saving ? 'Guardando...' : 'Confirmar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CuentasPorPagar;
