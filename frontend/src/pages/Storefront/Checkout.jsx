import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useCartStore } from './CartStore';
import { ArrowLeft, CheckCircle, CreditCard, Banknote } from 'lucide-react';
import './Storefront.css';

const StorefrontCheckout = ({ customTenantId }) => {
  const params = useParams();
  const tenantId = customTenantId || params.tenantId;
  const navigate = useNavigate();
  const { items, clearCart, getTotal } = useCartStore();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cardData, setCardData] = useState({
    number: '', expiry: '', cvv: ''
  });
  const [paymentStep, setPaymentStep] = useState(null); // 'PROCESSING_CARD'
  
  const [loading, setLoading] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState(null);

  const cartTotal = getTotal();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    setLoading(true);
    let finalPaymentStatus = 'PENDING';

    try {
      if (paymentMethod === 'CARD') {
        setPaymentStep('PROCESSING_CARD');
        // Simular validación bancaria de 2.5 segundos
        await new Promise(resolve => setTimeout(resolve, 2500));
        finalPaymentStatus = 'PAID';
        setPaymentStep(null);
      }

      const orderItems = items.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { data: orderId, error } = await supabase.rpc('submit_web_order', {
        p_tenant_id: tenantId,
        p_customer_name: formData.name,
        p_customer_phone: formData.phone,
        p_delivery_address: formData.address,
        p_notes: formData.notes,
        p_total: cartTotal,
        p_items: orderItems,
        p_payment_method: paymentMethod,
        p_payment_status: finalPaymentStatus
      });

      if (error) throw error;

      setSuccessOrderId(orderId);
      clearCart();
    } catch (err) {
      console.error(err);
      alert('Hubo un error al procesar el pedido. Por favor intenta de nuevo.');
      setPaymentStep(null);
    } finally {
      setLoading(false);
    }
  };

  if (successOrderId) {
    return (
      <div className="storefront-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '400px' }}>
          <CheckCircle size={64} color="#10b981" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ marginBottom: '10px' }}>¡Pedido Confirmado!</h2>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>Tu orden ha sido recibida y será procesada pronto.</p>
          <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px', fontFamily: 'monospace', marginBottom: '24px', fontSize: '12px' }}>
            Orden ID: {successOrderId}
          </div>
          <button 
            className="checkout-btn" 
            style={{ width: '100%', background: '#3b82f6' }}
            onClick={() => navigate(customTenantId ? '/' : `/tienda/${tenantId}`)}
          >
            Volver a la Tienda
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="storefront-container" style={{ padding: '40px', textAlign: 'center' }}>
        <h2>Tu carrito está vacío</h2>
        <button onClick={() => navigate(customTenantId ? '/' : `/tienda/${tenantId}`)} style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}>
          Volver a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="storefront-container">
      <header className="storefront-header">
        <div className="storefront-header-content" style={{ justifyContent: 'flex-start', gap: '16px' }}>
          <button onClick={() => navigate(customTenantId ? '/' : `/tienda/${tenantId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={24} color="#475569" />
          </button>
          <h1>Completar Pedido</h1>
        </div>
      </header>

      <main className="storefront-main" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '32px', alignItems: 'start' }}>
        {/* Formulario de Cliente */}
        <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Tus Datos de Envío</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Nombre Completo *</label>
              <input required type="text" name="name" value={formData.name} onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Teléfono (WhatsApp) *</label>
              <input required type="text" name="phone" value={formData.phone} onChange={handleInputChange}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Dirección de Entrega</label>
              <textarea required name="address" value={formData.address} onChange={handleInputChange} rows="3"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Notas adicionales (Opcional)</label>
              <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2"
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} placeholder="Ej: Llamar al llegar, dejar en portería..." />
            </div>

            <button type="submit" className="checkout-btn" disabled={loading} style={{ marginTop: '16px', position: 'relative' }}>
              {paymentStep === 'PROCESSING_CARD' ? 'Procesando Tarjeta...' : loading ? 'Guardando...' : `Confirmar Pedido - $${cartTotal.toFixed(2)}`}
            </button>
          </form>
        </div>

        {/* Resumen del Carrito y Pagos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Método de Pago */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Método de Pago</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: paymentMethod === 'CASH' ? '2px solid #3b82f6' : '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" name="paymentMethod" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} style={{ width: '18px', height: '18px' }} />
                <Banknote color={paymentMethod === 'CASH' ? '#3b82f6' : '#64748b'} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>Efectivo</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Pagas al recibir tu pedido</span>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: paymentMethod === 'CARD' ? '2px solid #3b82f6' : '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <input type="radio" name="paymentMethod" value="CARD" checked={paymentMethod === 'CARD'} onChange={() => setPaymentMethod('CARD')} style={{ width: '18px', height: '18px' }} />
                <CreditCard color={paymentMethod === 'CARD' ? '#3b82f6' : '#64748b'} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600 }}>Tarjeta de Crédito / Débito</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Pago seguro en línea (Simulado)</span>
                </div>
              </label>
            </div>

            {paymentMethod === 'CARD' && (
              <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600 }}>Número de Tarjeta</label>
                  <input type="text" placeholder="0000 0000 0000 0000" maxLength="19" required={paymentMethod === 'CARD'}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    onChange={e => setCardData({...cardData, number: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600 }}>Vencimiento</label>
                    <input type="text" placeholder="MM/YY" maxLength="5" required={paymentMethod === 'CARD'}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      onChange={e => setCardData({...cardData, expiry: e.target.value})} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 600 }}>CVV</label>
                    <input type="text" placeholder="123" maxLength="4" required={paymentMethod === 'CARD'}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      onChange={e => setCardData({...cardData, cvv: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Resumen</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span>{item.quantity}x {item.name}</span>
                <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700 }}>
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default StorefrontCheckout;
