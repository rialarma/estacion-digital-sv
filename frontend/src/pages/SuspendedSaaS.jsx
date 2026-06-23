import React from 'react';
import { ShieldAlert, CreditCard } from 'lucide-react';
import { supabase } from '../supabase';

const SuspendedSaaS = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-main)',
      color: 'var(--text-main)'
    }}>
      <div className="glass-panel" style={{ padding: '40px', maxWidth: '480px', textAlign: 'center' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' 
        }}>
          <ShieldAlert size={40} color="#ef4444" />
        </div>
        
        <h1 style={{ fontSize: '24px', marginBottom: '16px', color: 'var(--text-main)' }}>Suscripción Suspendida</h1>
        
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.6' }}>
          Lo sentimos, el acceso a tu plataforma ha sido bloqueado porque tu suscripción se encuentra suspendida o ha expirado. 
          Para restablecer el acceso a tu inventario, punto de venta y facturación, por favor renueva tu plan.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button 
            className="glass-button" 
            style={{ width: '100%', justifyContent: 'center', background: 'var(--primary)', color: '#fff', border: 'none', height: '48px', fontSize: '16px' }}
            onClick={() => window.open('https://buy.stripe.com/test_link_here', '_blank')}
          >
            <CreditCard size={20} />
            Renovar Suscripción (Stripe)
          </button>
          
          <button 
            className="glass-button" 
            style={{ width: '100%', justifyContent: 'center', background: 'transparent' }}
            onClick={handleLogout}
          >
            Cerrar Sesión
          </button>
          
          {/* Dev Only: Botón para quitar la suspensión */}
          <button 
            onClick={async () => {
              const { data: userData } = await supabase.auth.getUser();
              const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', userData?.user?.id).single();
              if (profile?.tenant_id) {
                await supabase.from('tenants').update({ subscription_status: 'ACTIVE' }).eq('id', profile.tenant_id);
                window.location.reload();
              }
            }}
            style={{ width: '100%', background: 'none', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '12px', borderRadius: '8px', cursor: 'pointer', marginTop: '16px' }}
          >
            Dev: Quitar Suspensión
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuspendedSaaS;
