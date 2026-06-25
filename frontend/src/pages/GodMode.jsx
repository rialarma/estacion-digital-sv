import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, Unlock, Save, Settings, Users, Store, Layers, BookOpen, Truck, Contact } from 'lucide-react';

const GOD_PIN = '25081993';

const GodMode = () => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      fetchTenants();
    }
  }, [isUnlocked]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTenants(data || []);
    } catch (err) {
      console.error(err);
      alert('Error cargando tenants: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = (e) => {
    e.preventDefault();
    if (pinInput === GOD_PIN) {
      setIsUnlocked(true);
    } else {
      alert('PIN Incorrecto');
      setPinInput('');
    }
  };

  const handleToggleModule = async (tenantId, moduleName, currentValue) => {
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ [moduleName]: !currentValue })
        .eq('id', tenantId);
        
      if (error) throw error;
      
      // Update local state
      setTenants(tenants.map(t => 
        t.id === tenantId ? { ...t, [moduleName]: !currentValue } : t
      ));
    } catch (err) {
      console.error(err);
      alert('Error actualizando módulo: ' + err.message);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)' }}>
        <div className="glass-panel" style={{ padding: '40px', width: '400px', textAlign: 'center' }}>
          <ShieldAlert size={64} style={{ color: '#ef4444', marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '10px' }}>Acceso Restringido</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Solo personal autorizado.</p>
          
          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input 
              type="password" 
              className="glass-input" 
              placeholder="Ingresa el PIN Maestro" 
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '4px' }}
              autoFocus
            />
            <button type="submit" className="glass-button" style={{ justifyContent: 'center', background: '#ef4444' }}>
              <Unlock size={18} /> Desbloquear
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '40px' }}>
      <div className="page-header" style={{ marginBottom: '30px', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', paddingBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }}>
            <ShieldAlert size={32} /> God Mode - Panel de Control Súper Admin
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Gestiona los módulos (Add-ons) de todas las empresas (Tenants) en la plataforma.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando empresas...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {tenants.map(tenant => (
            <div key={tenant.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Store size={24} color="var(--primary)" /> {tenant.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                    <span>ID: {tenant.id.split('-')[0]}...</span>
                    {tenant.nit && <span>NIT: {tenant.nit}</span>}
                    {tenant.nrc && <span>NRC: {tenant.nrc}</span>}
                  </div>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                  Plan: {tenant.subscription_plan || 'BASIC'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                
                {/* Modulo Inventario */}
                <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={18} color="var(--text-muted)" />
                    <span style={{ fontWeight: 500 }}>Inventario</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={tenant.module_inventory !== false} 
                      onChange={() => handleToggleModule(tenant.id, 'module_inventory', tenant.module_inventory !== false)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                  </label>
                </div>

                {/* Modulo Membresias */}
                <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Contact size={18} color="var(--text-muted)" />
                    <span style={{ fontWeight: 500 }}>Membresías</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={tenant.module_memberships === true} 
                      onChange={() => handleToggleModule(tenant.id, 'module_memberships', tenant.module_memberships === true)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                  </label>
                </div>

                {/* Modulo Contabilidad */}
                <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BookOpen size={18} color="var(--text-muted)" />
                    <span style={{ fontWeight: 500 }}>Contabilidad</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={tenant.module_accounting === true} 
                      onChange={() => handleToggleModule(tenant.id, 'module_accounting', tenant.module_accounting === true)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                  </label>
                </div>

                {/* Modulo Logística */}
                <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Truck size={18} color="var(--text-muted)" />
                    <span style={{ fontWeight: 500 }}>Logística</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={tenant.module_logistics === true} 
                      onChange={() => handleToggleModule(tenant.id, 'module_logistics', tenant.module_logistics === true)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#10b981' }}
                    />
                  </label>
                </div>

              </div>
            </div>
          ))}
          
          {tenants.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--glass-bg)', borderRadius: '12px' }}>
              No hay empresas registradas en el sistema.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GodMode;
