import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { User, Building2 } from 'lucide-react';

const JoinTenant = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '' });

  useEffect(() => {
    if (!authLoading && !user) {
      // Si no está logueado y ya terminó de checar sesión, guarda el código y envíalo a login/registro
      localStorage.setItem('pendingInviteCode', inviteCode);
      navigate('/');
    }
  }, [user, authLoading, inviteCode, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('join_tenant_by_code', {
        p_invite_code: inviteCode,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName
      });
      if (rpcError) throw rpcError;
      
      localStorage.removeItem('pendingInviteCode');
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Cargando perfil...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Building2 size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Únete a tu Empresa</h1>
          <p style={{ color: 'var(--text-muted)' }}>Ingresa tu nombre para completar la configuración.</p>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label>Nombre</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input type="text" className="glass-input" style={{ paddingLeft: '40px' }} required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="Ej. Juan" />
            </div>
          </div>
          <div className="form-group">
            <label>Apellido</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              <input type="text" className="glass-input" style={{ paddingLeft: '40px' }} required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Ej. Pérez" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="glass-button" style={{ background: 'var(--primary)', color: 'white', justifyContent: 'center' }}>
            {loading ? 'Entrando...' : 'Entrar al Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default JoinTenant;
