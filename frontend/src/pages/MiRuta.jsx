import React, { useState, useEffect } from 'react';
import { Clock, Truck, MapPin, CheckCircle, Package, DollarSign, Users, Navigation } from 'lucide-react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';

const MiRuta = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [driverId, setDriverId] = useState(null);
  
  // Admin logic
  const [userRole, setUserRole] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);

  // Attendance logic
  const [activeShift, setActiveShift] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tenantId, setTenantId] = useState(null);


  useEffect(() => {
    if (user) {
      loadProfileAndRoute();
      fetchActiveShift();
    }
  }, [user]);

  const fetchActiveShift = async () => {
    try {
      const { data: shiftData } = await supabase
        .from('employee_attendance')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      setActiveShift(shiftData || null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClockIn = async () => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_attendance')
        .insert([{ tenant_id: tenantId, user_id: user.id }])
        .select()
        .single();
      if (!error && data) setActiveShift(data);
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('employee_attendance')
        .update({ clock_out: new Date().toISOString() })
        .eq('id', activeShift.id);
      if (!error) setActiveShift(null);
    } catch (e) { console.error(e); }
    setActionLoading(false);
  };

  const loadProfileAndRoute = async () => {
    setLoading(true);
    try {
      // 1. Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");
      setUserRole(profile.role);
      setTenantId(profile.tenant_id);

      if (profile.role === 'ADMIN' || profile.role === 'GERENTE') {
        // Fetch all drivers for admin selection
        const { data: drivers } = await supabase
          .from('drivers')
          .select('id, name')
          .eq('tenant_id', profile.tenant_id)
          .order('name');
          
        setAllDrivers(drivers || []);
        setLoading(false);
      } else {
        // It's a REPARTIDOR, auto-link to their driver profile
        const driverName = `${profile.first_name} ${profile.last_name}`;
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('name', driverName)
          .eq('tenant_id', profile.tenant_id)
          .maybeSingle();

        if (driver) {
          setDriverId(driver.id);
          await fetchRouteForDriver(driver.id);
        } else {
          setLoading(false); // No driver linked
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error cargando perfil: " + err.message);
      setLoading(false);
    }
  };

  const fetchRouteForDriver = async (id) => {
    setLoading(true);
    try {
      const { data: assignedSales, error } = await supabase
        .from('sales')
        .select(`
          id, created_at, total, delivery_status,
          clients(name, phone, address),
          sale_items(quantity, products(name))
        `)
        .eq('driver_id', id)
        .in('delivery_status', ['PENDIENTE_DE_CARGA', 'EN_RUTA'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(assignedSales || []);
    } catch (err) {
      console.error(err);
      alert("Error cargando ruta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminDriverSelect = (e) => {
    const id = e.target.value;
    setDriverId(id);
    if (id) {
      fetchRouteForDriver(id);
    } else {
      setSales([]);
    }
  };

  const markAsDelivered = async (saleId) => {
    if (!window.confirm("¿Confirmar que este pedido fue entregado exitosamente?")) return;

    try {
      const { error } = await supabase
        .from('sales')
        .update({ delivery_status: 'ENTREGADO' })
        .eq('id', saleId);

      if (error) throw error;
      
      // Update local state to remove the delivered item
      setSales(sales.filter(s => s.id !== saleId));
      alert("¡Entrega registrada!");
    } catch (err) {
      alert("Error registrando entrega: " + err.message);
    }
  };

  const openGPS = (address) => {
    if (!address) {
      alert("Este cliente no tiene dirección registrada.");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };



  if (loading && !allDrivers.length) {
    return <div className="page-container"><p style={{ textAlign: 'center', padding: '40px' }}>Cargando ruta...</p></div>;
  }

  return (
    <div className="page-container fade-in" style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
      
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '12px', borderRadius: '12px' }}>
              <Truck size={24} color="#10b981" />
            </div>
            <div>
              <h1 style={{ fontSize: '24px', margin: 0 }}>Mi Ruta Móvil</h1>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Entregas pendientes</p>
            </div>
          </div>
          
          <button 
            onClick={activeShift ? handleClockOut : handleClockIn}
            disabled={actionLoading}
            style={{
              background: activeShift ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: activeShift ? '#ef4444' : '#10b981',
              border: `1px solid ${activeShift ? '#ef4444' : '#10b981'}`,
              padding: '8px 16px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
              fontWeight: 'bold', transition: 'all 0.3s'
            }}
          >
            <Clock size={16} />
            {actionLoading ? '...' : (activeShift ? 'Finalizar Turno' : 'Iniciar Turno')}
          </button>
        </div>
      </div>

      {(userRole === 'ADMIN' || userRole === 'GERENTE') && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', borderLeft: '4px solid #8b5cf6' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '8px' }}>
            <Users size={16} /> Ver ruta como Administrador
          </label>
          <select 
            className="glass-input" 
            value={driverId || ''} 
            onChange={handleAdminDriverSelect}
            style={{ width: '100%', padding: '12px', fontSize: '16px' }}
          >
            <option value="">-- Selecciona un Repartidor --</option>
            {allDrivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}

      {!driverId ? (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', marginTop: '16px' }}>
          <Truck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <h2>Perfil no vinculado</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {userRole === 'ADMIN' || userRole === 'GERENTE' 
              ? 'Selecciona un repartidor arriba para visualizar y administrar su ruta activa.'
              : 'Tu usuario no está vinculado a un vehículo de logística. Contacta al administrador.'}
          </p>
        </div>
      ) : loading ? (
         <div style={{ textAlign: 'center', padding: '40px' }}>Actualizando...</div>
      ) : sales.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px 20px', textAlign: 'center' }}>
          <CheckCircle size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h2>¡Al día!</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>No hay entregas pendientes en esta ruta.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sales.map((sale) => (
            <div key={sale.id} className="glass-panel" style={{ padding: '16px', borderLeft: sale.delivery_status === 'EN_RUTA' ? '4px solid #f59e0b' : '4px solid #3b82f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', margin: '0 0 4px 0' }}>{sale.clients?.name || 'Cliente Genérico'}</h3>
                  <span style={{ 
                    fontSize: '11px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px',
                    background: sale.delivery_status === 'EN_RUTA' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: sale.delivery_status === 'EN_RUTA' ? '#f59e0b' : '#3b82f6'
                  }}>
                    {sale.delivery_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>A Cobrar</span>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>${Number(sale.total).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <MapPin size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{sale.clients?.address || 'Sin dirección registrada'}</span>
                </p>
                {sale.clients?.phone && (
                  <p style={{ margin: '0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    📞 {sale.clients.phone}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="glass-button" 
                  style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                  onClick={() => openGPS(sale.clients?.address)}
                >
                  <MapPin size={18} /> GPS
                </button>
                <button 
                  className="glass-button" 
                  style={{ flex: 1, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: '#10b981' }}
                  onClick={() => markAsDelivered(sale.id)}
                >
                  <CheckCircle size={18} /> Entregado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MiRuta;
