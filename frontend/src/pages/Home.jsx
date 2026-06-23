import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useTenantStore } from '../store/useTenantStore';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, Monitor, FileSignature, 
  Package, Layers, ClipboardList, ArrowRightLeft,
  Briefcase, DollarSign, Settings
} from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const { tenantInfo } = useTenantStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, role')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando inicio...</div>;
  }

  // Definir acciones rápidas por rol
  const getQuickActions = (role) => {
    const actions = [];

    // Acciones para CAJERO, GERENTE, ADMIN
    if (['CAJERO', 'GERENTE', 'ADMIN'].includes(role)) {
      actions.push({
        title: 'Abrir / Cerrar Caja',
        desc: 'Gestiona tu turno de efectivo',
        icon: <Monitor size={32} color="#3b82f6" />,
        link: '/caja',
        color: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.3)'
      });
      actions.push({
        title: 'Punto de Venta (POS)',
        desc: 'Facturar y emitir DTEs',
        icon: <ShoppingCart size={32} color="#10b981" />,
        link: '/ventas',
        color: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)'
      });
      actions.push({
        title: 'Cotizaciones',
        desc: 'Crear proformas a clientes',
        icon: <FileSignature size={32} color="#eab308" />,
        link: '/cotizaciones',
        color: 'rgba(234, 179, 8, 0.1)',
        borderColor: 'rgba(234, 179, 8, 0.3)'
      });
    }

    // Acciones para BODEGUERO, GERENTE, ADMIN
    if (['BODEGUERO', 'GERENTE', 'ADMIN'].includes(role)) {
      actions.push({
        title: 'Existencias',
        desc: 'Ver stock actual',
        icon: <Layers size={32} color="#f59e0b" />,
        link: '/inventario',
        color: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.3)'
      });
      actions.push({
        title: 'Kardex',
        desc: 'Historial de movimientos',
        icon: <ClipboardList size={32} color="#8b5cf6" />,
        link: '/kardex',
        color: 'rgba(139, 92, 246, 0.1)',
        borderColor: 'rgba(139, 92, 246, 0.3)'
      });
      actions.push({
        title: 'Traslados',
        desc: 'Mover mercancía entre sucursales',
        icon: <ArrowRightLeft size={32} color="#ec4899" />,
        link: '/traslados',
        color: 'rgba(236, 72, 153, 0.1)',
        borderColor: 'rgba(236, 72, 153, 0.3)'
      });
    }

    // Acciones para CONTADOR, GERENTE, ADMIN
    if (['CONTADOR', 'GERENTE', 'ADMIN'].includes(role)) {
      actions.push({
        title: 'Cuentas por Cobrar',
        desc: 'Créditos otorgados a clientes',
        icon: <DollarSign size={32} color="#14b8a6" />,
        link: '/cartera/cxc',
        color: 'rgba(20, 184, 166, 0.1)',
        borderColor: 'rgba(20, 184, 166, 0.3)'
      });
      actions.push({
        title: 'Cuentas por Pagar',
        desc: 'Créditos con proveedores',
        icon: <Briefcase size={32} color="#ef4444" />,
        link: '/cartera/cxp',
        color: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)'
      });
    }

    // Acciones solo para ADMIN
    if (['ADMIN'].includes(role)) {
      actions.push({
        title: 'Configuración',
        desc: 'Ajustes del sistema',
        icon: <Settings size={32} color="#94a3b8" />,
        link: '/configuracion',
        color: 'rgba(148, 163, 184, 0.1)',
        borderColor: 'rgba(148, 163, 184, 0.3)'
      });
    }

    return actions;
  };

  const actions = profile ? getQuickActions(profile.role) : [];

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Saludo Principal */}
      <div className="glass-panel" style={{ padding: '40px', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>
          ¡Hola, <span style={{ color: 'var(--primary)' }}>{profile?.first_name || 'Usuario'}</span>! 👋
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Bienvenido de vuelta a {tenantInfo?.company_name || 'tu sistema'}.
        </p>
        <div style={{ background: 'var(--bg-dark)', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', display: 'inline-block', marginBottom: profile?.role === 'ADMIN' ? '20px' : '0' }}>
          Rol: {profile?.role || 'No definido'}
        </div>

        {profile?.role === 'ADMIN' && (
          <div style={{
            background: tenantInfo?.subscription_status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${tenantInfo?.subscription_status === 'ACTIVE' ? '#10b981' : '#ef4444'}`,
            padding: '12px 24px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>
              Suscripción: <strong style={{ color: tenantInfo?.subscription_status === 'ACTIVE' ? '#10b981' : '#ef4444' }}>
                {tenantInfo?.subscription_status === 'ACTIVE' ? 'ACTIVA' : 'INACTIVA'}
              </strong>
            </span>
            <button 
              onClick={async () => {
                const newStatus = tenantInfo?.subscription_status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
                const { error } = await supabase.from('tenants').update({ subscription_status: newStatus }).eq('id', tenantInfo.id);
                if (!error) {
                  useTenantStore.getState().updateTenantInfo({ subscription_status: newStatus });
                  // Si pasa a SUSPENDED, App.jsx lo detectará y mostrará la pantalla de bloqueo automáticamente
                  // Si estábamos probando desde SuspendedSaaS (ej: renovando), allí debe haber un botón también.
                  // Pero como esta pantalla es Home, solo puede pasar de ACTIVE a SUSPENDED.
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid var(--text-muted)',
                color: 'var(--text-main)',
                padding: '4px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Simular Bloqueo
            </button>
          </div>
        )}
      </div>

      {/* Acciones Rápidas */}
      <h2 style={{ fontSize: '20px', marginBottom: '20px', marginLeft: '4px' }}>¿Qué te gustaría hacer hoy?</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {actions.map((action, idx) => (
          <Link 
            key={idx} 
            to={action.link}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div 
              className="glass-panel" 
              style={{ 
                padding: '24px', 
                height: '100%',
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                background: action.color,
                border: `1px solid ${action.borderColor}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '12px' }}>
                {action.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{action.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{action.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
};

export default Home;
