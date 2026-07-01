import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { ArrowLeft, User, Package, MapPin, Phone, LogOut } from 'lucide-react';

const StoreProfile = () => {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate(`/tienda/${tenantId}`);
      return;
    }
    
    setUser(session.user);
    await fetchProfileData(session.user.id);
  };

  const fetchProfileData = async (userId) => {
    try {
      // Fetch client profile
      const { data: profileData, error: profileError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      setClientProfile(profileData);

      if (profileData) {
        // Fetch web orders
        const { data: ordersData, error: ordersError } = await supabase
          .from('web_orders')
          .select('*, web_order_items(*)')
          .eq('client_id', profileData.id)
          .order('created_at', { ascending: false });
          
        if (ordersError) throw ordersError;
        setOrders(ordersData || []);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(`/tienda/${tenantId}`);
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc' }}>Cargando...</div>;
  }

  return (
    <div className="storefront-container" style={{ background: '#f8fafc', minHeight: '100vh', paddingBottom: '4rem' }}>
      <header className="storefront-header" style={{ position: 'relative' }}>
        <div className="storefront-header-content" style={{ justifyContent: 'flex-start', gap: '16px' }}>
          <button onClick={() => navigate(`/tienda/${tenantId}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--sf-text-on-primary)' }}>
            <ArrowLeft size={24} />
          </button>
          <h1 className="sf-title" style={{ fontSize: '1.25rem' }}>Mi Cuenta</h1>
        </div>
      </header>

      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Perfil */}
          <section style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'color-mix(in srgb, var(--sf-primary) 10%, transparent)', color: 'var(--sf-primary)', padding: '1rem', borderRadius: '50%' }}>
                <User size={32} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{clientProfile?.name || 'Cliente'}</h2>
                <p style={{ margin: 0, color: '#64748b' }}>{user?.email}</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569' }}>
                <Phone size={18} />
                <span>{clientProfile?.phone || 'Sin teléfono guardado'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#475569' }}>
                <MapPin size={18} />
                <span>{clientProfile?.address || 'Sin dirección guardada'}</span>
              </div>
            </div>

            <button onClick={handleLogout} style={{ marginTop: '2rem', width: '100%', padding: '0.75rem', borderRadius: '12px', background: '#fee2e2', color: '#ef4444', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </section>

          {/* Historial de Pedidos */}
          <section style={{ background: 'white', padding: '2rem', borderRadius: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Package size={24} color="var(--sf-primary)" />
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Mis Pedidos</h2>
            </div>

            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                <Package size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
                <p>Aún no tienes pedidos.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map(order => (
                  <div key={order.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>${Number(order.total).toFixed(2)}</span>
                      <span style={{ fontSize: '0.8rem', background: order.status === 'DISPATCHED' ? '#dcfce7' : '#fef9c3', color: order.status === 'DISPATCHED' ? '#166534' : '#854d0e', padding: '4px 8px', borderRadius: '20px', fontWeight: 600 }}>
                        {order.status === 'DISPATCHED' ? 'COMPLETADO' : 'PENDIENTE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span>{order.web_order_items?.length || 0} artículos</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default StoreProfile;
