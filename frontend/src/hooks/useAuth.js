import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setTenant, clearTenant } = useTenantStore();

  useEffect(() => {
    const fetchUserAndTenant = async () => {
      console.log("fetchUserAndTenant: START");
      try {
        console.log("fetchUserAndTenant: getting session...");
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log("fetchUserAndTenant: got session", session);
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          setUser(session.user);
          // Load tenant profile
          console.log("fetchUserAndTenant: fetching profile...");
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('tenant_id')
            .eq('id', session.user.id)
            .single();
          console.log("fetchUserAndTenant: got profile", profile);
            
          if (profile?.tenant_id) {
            console.log("fetchUserAndTenant: fetching tenant...");
            const { data: tenant } = await supabase
              .from('tenants')
              .select('*')
              .eq('id', profile.tenant_id)
              .single();
            console.log("fetchUserAndTenant: got tenant", tenant);
              
            setTenant(profile.tenant_id, tenant);
          } else {
            clearTenant();
          }
        } else {
          setUser(null);
          clearTenant();
        }
      } catch (err) {
        console.error("Error fetching user session/tenant:", err);
        setUser(null);
        clearTenant();
      } finally {
        console.log("fetchUserAndTenant: FINALLY, setting loading to false");
        setLoading(false);
      }
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
