import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTenant, clearTenant } = useTenantStore();

  useEffect(() => {
    const fetchUserAndTenant = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        // Load tenant profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('tenant_id')
          .eq('id', session.user.id)
          .single();
          
        if (profile?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', profile.tenant_id)
            .single();
            
          setTenant(profile.tenant_id, tenant);
        }
      } else {
        setUser(null);
        clearTenant();
      }
      setLoading(false);
    };

    fetchUserAndTenant();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        clearTenant();
      } else {
        fetchUserAndTenant();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};
