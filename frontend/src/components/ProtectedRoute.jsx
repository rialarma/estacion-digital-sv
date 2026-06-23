import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();
        
      if (data) {
        setRole(data.role);
        
        // Comprobar suscripción SaaS
        if (data.tenant_id) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('subscription_status')
            .eq('id', data.tenant_id)
            .single();
            
          if (tenantData && tenantData.subscription_status === 'SUSPENDED') {
            setRole('SUSPENDED');
          }
        }
      }
      setLoading(false);
    };
    
    fetchRole();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>Verificando accesos...</div>;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (role === 'SUSPENDED') {
    return <Navigate to="/suspendido" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <ShieldAlert size={64} style={{ color: '#ef4444', marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p>Tu rol ({role}) no tiene permisos para ver esta pantalla.</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
