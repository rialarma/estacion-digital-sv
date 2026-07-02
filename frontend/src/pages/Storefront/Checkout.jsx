import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useCartStore } from './CartStore';
import { ArrowLeft, CheckCircle, CreditCard, Banknote, User } from 'lucide-react';
import AuthStoreModal from './AuthStoreModal';
import './Storefront.css';

const StorefrontCheckout = ({ customTenantId }) => {
  const params = useParams();
  const tenantId = customTenantId || params.tenantId;
  const navigate = useNavigate();
  const { items, clearCart, getTotal, fetchCloudCart } = useCartStore();
  
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
  const [tenantConfig, setTenantConfig] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      if (tenantId) {
        const { data } = await supabase.rpc('get_storefront_config', { p_tenant_id: tenantId });
        if (data) setTenantConfig(data);
      }
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
        if (tenantId) {
          fetchCloudCart(tenantId);
        }
        const { data: profile } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('tenant_id', tenantId)
          .single();
          
        if (profile) {
          setClientProfile(profile);
          setFormData(prev => ({
            ...prev,
            name: profile.name || prev.name,
            phone: profile.phone || prev.phone,
            address: profile.address || prev.address
          }));
        } else {
          // Si el usuario acaba de iniciar sesión con Google y no tiene perfil de cliente, lo creamos
          const defaultName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          const { error: rpcError } = await supabase.rpc('register_store_customer', {
            p_tenant_id: tenantId,
            p_name: defaultName,
            p_phone: '',
            p_address: '',
            p_email: session.user.email
          });
          if (!rpcError) {
            // Re-fetch para cargar el id del cliente
            const { data: newProfile } = await supabase.from('clients').select('*').eq('user_id', session.user.id).eq('tenant_id', tenantId).single();
            if (newProfile) {
              setClientProfile(newProfile);
              setFormData(prev => ({ ...prev, name: defaultName }));
            }
          }
        }
      }
    };

    fetchConfig();
    checkUser();
  }, [tenantId]);

  const cartTotal = getTotal();
  const shippingCost = tenantConfig?.store_shipping_cost || 0;
  const finalTotal = cartTotal + shippingCost;

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
        p_total: finalTotal,
        p_items: orderItems,
        p_payment_method: paymentMethod,
        p_payment_status: finalPaymentStatus,
        p_client_id: clientProfile?.id || null
      });

      if (error) throw error;

      // Actualizar el perfil del cliente para guardar su dirección y teléfono para futuras compras
      if (currentUser) {
        await supabase.rpc('register_store_customer', {
          p_tenant_id: tenantId,
          p_name: formData.name,
          p_phone: formData.phone,
          p_address: formData.address,
          p_email: currentUser.email
        });
      }

      // Enviar mensaje de WhatsApp a la cola
      try {
        const storePhone = tenantConfig?.whatsapp_number;
        const storeName = tenantConfig?.name || 'la tienda';
        const contactMessage = storePhone ? `\n\n*(Este es un mensaje automático, por favor no respondas aquí).*\nSi tienes alguna duda sobre tu pedido, contacta a la tienda directamente aquí: https://wa.me/${storePhone.replace(/\D/g, '')}` : '';
        
        const waMessage = `¡Hola ${formData.name.split(' ')[0]}! Somos el sistema de notificaciones de ${storeName}. Confirmamos tu pedido #${orderId.substring(0,6).toUpperCase()} por un total de $${finalTotal.toFixed(2)}. ¡Gracias por tu compra! Te avisaremos cuando vaya en camino.${contactMessage}`;
        
        await supabase.from('whatsapp_queue').insert({
          tenant_id: tenantId,
          phone_number: formData.phone,
          message_body: waMessage
        });
      } catch (waErr) {
        console.error("Error al encolar WhatsApp:", waErr);
      }

      setSuccessOrderId(orderId);
      clearCart(tenantId);
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
      <style>{`
        .storefront-container {
          --sf-primary: ${tenantConfig?.primary_color || '#0f172a'};
          --sf-primary-hover: ${tenantConfig?.primary_color ? tenantConfig.primary_color + 'dd' : '#1e293b'};
          --sf-text-on-primary: ${tenantConfig?.store_primary_text_color || '#ffffff'};
        }
      `}</style>
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
            <h2 className="sf-title" style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Datos de Envío</h2>
            
            {!currentUser ? (
              <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <User size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>¡Hola! Inicia sesión para continuar</h3>
                <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Para ofrecerte una experiencia de compra segura y más rápida, requerimos que inicies sesión.</p>
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'var(--sf-primary)', color: 'var(--sf-text-on-primary)', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  Iniciar sesión o Registrarse
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Nombre Completo *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleInputChange}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                </div>
                <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px', color: '#1e293b' }}>Número de WhatsApp *</label>
            <input 
              type="tel" 
              name="phone"
              required
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Ej: 79331571"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '15px' }}
            />
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Te enviaremos la confirmación y el estado de tu pedido por WhatsApp.
            </p>
          </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Dirección de Entrega *</label>
                  <textarea required name="address" value={formData.address} onChange={handleInputChange} rows={3}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}></textarea>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 600 }}>Notas adicionales</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={2}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} placeholder="Opcional"></textarea>
                </div>

                <div style={{ marginTop: '16px' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Método de Pago</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => setPaymentMethod('CASH')}
                      style={{ flex: 1, padding: '16px', borderRadius: '8px', border: paymentMethod === 'CASH' ? '2px solid var(--sf-primary)' : '1px solid #e2e8f0', background: paymentMethod === 'CASH' ? 'color-mix(in srgb, var(--sf-primary) 5%, transparent)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Banknote size={24} color={paymentMethod === 'CASH' ? 'var(--sf-primary)' : '#64748b'} />
                      <span style={{ fontWeight: 600, color: paymentMethod === 'CASH' ? 'var(--sf-primary)' : '#64748b' }}>Efectivo al recibir</span>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('CARD')}
                      style={{ flex: 1, padding: '16px', borderRadius: '8px', border: paymentMethod === 'CARD' ? '2px solid var(--sf-primary)' : '1px solid #e2e8f0', background: paymentMethod === 'CARD' ? 'color-mix(in srgb, var(--sf-primary) 5%, transparent)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <CreditCard size={24} color={paymentMethod === 'CARD' ? 'var(--sf-primary)' : '#64748b'} />
                      <span style={{ fontWeight: 600, color: paymentMethod === 'CARD' ? 'var(--sf-primary)' : '#64748b' }}>Tarjeta (Simulado)</span>
                    </button>
                  </div>
                </div>

                {paymentMethod === 'CARD' && (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', marginTop: '8px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>🔒 Pago seguro 256-bit (Modo Prueba)</p>
                    <input type="text" placeholder="Número de Tarjeta" value={cardData.number} onChange={e => setCardData({ ...cardData, number: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="text" placeholder="MM/YY" value={cardData.expiry} onChange={e => setCardData({ ...cardData, expiry: e.target.value })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="text" placeholder="CVV" value={cardData.cvv} onChange={e => setCardData({ ...cardData, cvv: e.target.value })} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} style={{ marginTop: '16px', width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--sf-primary)', color: 'var(--sf-text-on-primary)', border: 'none', fontWeight: 'bold', fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? (
                    paymentStep === 'PROCESSING_CARD' ? 'Verificando Tarjeta...' : 'Procesando Pedido...'
                  ) : (
                    `Confirmar Pedido - $${finalTotal.toFixed(2)}`
                  )}
                </button>
              </form>
            )}
        </div>

        {/* Resumen del Carrito y Pagos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          {shippingCost > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '20px', color: '#64748b' }}>
              <span>Envío a Domicilio</span>
              <span style={{ fontWeight: 600 }}>${shippingCost.toFixed(2)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700 }}>
            <span>Total</span>
            <span>${finalTotal.toFixed(2)}</span>
          </div>
        </div>
        </div>
      </main>

      <AuthStoreModal 
        tenantId={tenantId}
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          // Recargar para que fetchConfig dispare checkUser() nuevamente
          window.location.reload(); 
        }}
      />
    </div>
  );
};

export default StorefrontCheckout;
