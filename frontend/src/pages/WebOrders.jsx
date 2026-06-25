import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { ShoppingBag, CheckCircle, Package, Clock, RefreshCw, Eye } from 'lucide-react';

const WebOrders = () => {
  const { tenantId, tenantInfo } = useTenantStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Perfil del usuario para obtener el branch_id
  const [profile, setProfile] = useState(null);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('web_orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data } = await supabase.from('user_profiles').select('*').eq('id', userData.user.id).single();
        setProfile(data);
      }
    };
    
    if (tenantId) {
      fetchProfile();
      fetchOrders();
    }
  }, [tenantId]);

  // Suscripción en tiempo real a nuevos pedidos
  useEffect(() => {
    if (!tenantId) return;

    const subscription = supabase
      .channel('web-orders-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'web_orders',
        filter: `tenant_id=eq.${tenantId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // Play a "ding" sound on new order
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
          audio.play().catch(err => console.log('Autoplay blocked:', err));
        }
        // Recargar pedidos cuando hay cambios
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tenantId]);

  const fetchOrderItems = async (orderId) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('web_order_items')
        .select(`
          id, quantity, price, subtotal,
          products (name, sku)
        `)
        .eq('web_order_id', orderId);
        
      if (error) throw error;
      setOrderItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    fetchOrderItems(order.id);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setProcessingId(orderId);
    try {
      const { error } = await supabase
        .from('web_orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
      if (error) throw error;
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConvertToSale = async (orderId) => {
    if (!confirm('¿Seguro que deseas convertir este pedido en Venta formal y descontar el inventario?')) return;
    
    setProcessingId(orderId);
    try {
      const { data: saleId, error } = await supabase.rpc('convert_web_order_to_sale', {
        p_web_order_id: orderId,
        p_cashier_id: profile.id,
        p_branch_id: profile.branch_id
      });

      if (error) throw error;
      
      alert(`¡Venta creada exitosamente!`);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      alert('Error al convertir a venta: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span style={{ background: '#fef08a', color: '#854d0e', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>PENDIENTE</span>;
      case 'PREPARING': return <span style={{ background: '#bfdbfe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>PREPARANDO</span>;
      case 'DISPATCHED': return <span style={{ background: '#bbf7d0', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>DESPACHADO / FACTURADO</span>;
      case 'CANCELLED': return <span style={{ background: '#fecaca', color: '#991b1b', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>CANCELADO</span>;
      default: return <span>{status}</span>;
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title"><ShoppingBag size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} /> Pedidos Web</h1>
        <button className="glass-button" onClick={fetchOrders} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> Actualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 400px' : '1fr', gap: '24px', alignItems: 'start' }}>
        {/* Tabla de Pedidos */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          {loading && orders.length === 0 ? (
            <p>Cargando pedidos...</p>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Package size={48} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
              <p>Aún no hay pedidos web.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
              
              {/* Columna: PENDIENTES */}
              <div style={{ background: 'rgba(234, 179, 8, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '16px', color: '#854d0e', display: 'flex', justifyContent: 'space-between' }}>
                  NUEVOS <span style={{ background: '#fef08a', padding: '2px 8px', borderRadius: '12px' }}>{orders.filter(o => o.status === 'PENDING').length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {orders.filter(o => o.status === 'PENDING').map(order => (
                    <div key={order.id} className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: selectedOrder?.id === order.id ? '2px solid #3b82f6' : '1px solid var(--border-color)', transform: selectedOrder?.id === order.id ? 'scale(1.02)' : 'scale(1)', transition: 'all 0.2s' }} onClick={() => handleViewOrder(order)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span style={{ fontWeight: 'bold', color: order.payment_method === 'CARD' ? '#3b82f6' : '#10b981', fontSize: '12px' }}>{order.payment_method}</span>
                      </div>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{order.customer_name}</div>
                      <div style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '800', marginTop: '8px' }}>${Number(order.total).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna: PREPARANDO */}
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '16px', color: '#1e40af', display: 'flex', justifyContent: 'space-between' }}>
                  PREPARANDO <span style={{ background: '#bfdbfe', padding: '2px 8px', borderRadius: '12px' }}>{orders.filter(o => o.status === 'PREPARING').length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {orders.filter(o => o.status === 'PREPARING').map(order => (
                    <div key={order.id} className="glass-panel" style={{ padding: '16px', cursor: 'pointer', border: selectedOrder?.id === order.id ? '2px solid #3b82f6' : '1px solid var(--border-color)' }} onClick={() => handleViewOrder(order)}>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{order.customer_name}</div>
                      <div style={{ color: 'var(--text-main)', fontSize: '18px', fontWeight: '800', marginTop: '4px' }}>${Number(order.total).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna: DESPACHADOS (VENTAS) */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '16px', color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                  DESPACHADOS <span style={{ background: '#bbf7d0', padding: '2px 8px', borderRadius: '12px' }}>{orders.filter(o => o.status === 'DISPATCHED').length}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {orders.filter(o => o.status === 'DISPATCHED').map(order => (
                    <div key={order.id} className="glass-panel" style={{ padding: '16px', cursor: 'pointer', opacity: 0.7, border: selectedOrder?.id === order.id ? '2px solid #3b82f6' : '1px solid var(--border-color)' }} onClick={() => handleViewOrder(order)}>
                      <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{order.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completado a las {new Date(order.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Panel lateral: Detalles del Pedido */}
        {selectedOrder && (
          <div className="glass-panel" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>Detalles del Pedido</h2>
              {getStatusBadge(selectedOrder.status)}
            </div>

            {selectedOrder.payment_method === 'CARD' ? (
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={20} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '14px' }}>PAGADO EN LÍNEA</div>
                  <div style={{ fontSize: '12px', color: '#3b82f6' }}>El cliente ya pagó con tarjeta. Solo despachar.</div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} color="#d97706" />
                <div>
                  <div style={{ fontWeight: 'bold', color: '#92400e', fontSize: '14px' }}>PAGO PENDIENTE</div>
                  <div style={{ fontSize: '12px', color: '#d97706' }}>Cobrar ${Number(selectedOrder.total).toFixed(2)} en efectivo contra entrega.</div>
                </div>
              </div>
            )}
            
            <div style={{ background: 'var(--bg-body)', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <p><strong>Cliente:</strong> {selectedOrder.customer_name}</p>
              <p><strong>Teléfono:</strong> {selectedOrder.customer_phone}</p>
              <p><strong>Dirección:</strong> {selectedOrder.delivery_address || 'N/A'}</p>
              {selectedOrder.notes && (
                <p><strong>Notas:</strong> <span style={{ color: 'var(--text-muted)' }}>{selectedOrder.notes}</span></p>
              )}
            </div>

            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>Artículos</h3>
            {loadingItems ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando artículos...</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {orderItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.products?.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.quantity} x ${Number(item.price).toFixed(2)}</div>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>${Number(item.subtotal).toFixed(2)}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '16px', fontWeight: 'bold' }}>
                  <span>Total</span>
                  <span>${Number(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {selectedOrder.status === 'PENDING' && (
                <button 
                  className="glass-button" 
                  style={{ width: '100%', justifyContent: 'center', background: '#3b82f6', color: 'white' }}
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                  disabled={processingId === selectedOrder.id}
                >
                  <Clock size={18} /> Marcar en Preparación
                </button>
              )}
              
              {(selectedOrder.status === 'PENDING' || selectedOrder.status === 'PREPARING') && (
                <button 
                  className="glass-button" 
                  style={{ width: '100%', justifyContent: 'center', background: '#10b981', color: 'white' }}
                  onClick={() => handleConvertToSale(selectedOrder.id)}
                  disabled={processingId === selectedOrder.id}
                >
                  <CheckCircle size={18} /> {selectedOrder.payment_method === 'CARD' ? 'Despachar Pedido (Ya pagado)' : 'Cobrar y Despachar'}
                </button>
              )}

              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DISPATCHED' && (
                <button 
                  className="glass-button" 
                  style={{ width: '100%', justifyContent: 'center', background: '#ef4444', color: 'white', opacity: 0.8 }}
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'CANCELLED')}
                  disabled={processingId === selectedOrder.id}
                >
                   Cancelar Pedido
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebOrders;
