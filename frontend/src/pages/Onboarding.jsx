import React, { useState } from 'react';
import { supabase } from '../supabase';
import { Building2, User, Building, CreditCard, LogOut, Key } from 'lucide-react';

const Onboarding = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyNit: '',
    companyPrefix: '',
    branchName: 'Sucursal Principal',
    firstName: '',
    lastName: '',
    inviteCode: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isJoining) {

        const { data, error: rpcError } = await supabase.rpc('join_tenant_by_code', {
          p_invite_code: formData.inviteCode,
          p_first_name: formData.firstName,
          p_last_name: formData.lastName
        });

        if (rpcError) throw rpcError;
        

        window.location.reload();
      } else {

        const { data, error: rpcError } = await supabase.rpc('register_tenant', {
          p_company_name: formData.companyName,
          p_company_nit: formData.companyNit,
          p_branch_name: formData.branchName,
          p_first_name: formData.firstName,
          p_last_name: formData.lastName,
          p_company_prefix: formData.companyPrefix
        });

        if (rpcError) throw rpcError;
        

        window.location.reload();
      }
    } catch (err) {
      console.error('Error:', err);
      setError(`Error: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-color)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Building2 size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Configura tu Perfil</h1>
          <p style={{ color: 'var(--text-muted)' }}>Crea tu espacio de trabajo o únete a uno existente.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button 
            type="button" 
            onClick={() => setIsJoining(false)} 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
              background: !isJoining ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: !isJoining ? 'var(--primary)' : 'var(--text-muted)'
            }}
          >
            Crear Empresa
          </button>
          <button 
            type="button" 
            onClick={() => setIsJoining(true)} 
            style={{ 
              flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600,
              background: isJoining ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              color: isJoining ? 'var(--primary)' : 'var(--text-muted)'
            }}
          >
            Unirse con Código
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="input-group">
              <label>Tu Nombre</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  name="firstName"
                  placeholder="Juan"
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="input-group">
              <label>Tu Apellido</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  name="lastName"
                  placeholder="Pérez"
                  className="glass-input"
                  style={{ paddingLeft: '40px' }}
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {!isJoining ? (
            <>
              <div className="input-group">
                <label>Nombre de la Empresa Comercial</label>
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <Building size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="companyName"
                    placeholder="Mi Negocio S.A. de C.V."
                    className="glass-input"
                    style={{ paddingLeft: '40px' }}
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>NIT de la Empresa</label>
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="companyNit"
                    placeholder="0000-000000-000-0"
                    className="glass-input"
                    style={{ paddingLeft: '40px' }}
                    value={formData.companyNit}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Prefijo de Empresa (Para Usuarios)</label>
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <Building size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="companyPrefix"
                    placeholder="Ej. emp"
                    className="glass-input"
                    style={{ paddingLeft: '40px' }}
                    value={formData.companyPrefix}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Nombre de Sucursal Principal</label>
                <div className="input-with-icon" style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    name="branchName"
                    className="glass-input"
                    style={{ paddingLeft: '40px' }}
                    value={formData.branchName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="input-group">
              <label>Código de Invitación</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  name="inviteCode"
                  placeholder="X7K9P2"
                  className="glass-input"
                  style={{ paddingLeft: '40px', fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase' }}
                  value={formData.inviteCode}
                  onChange={handleChange}
                  required
                />
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Pídele el código al Administrador del sistema.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            className="glass-button" 
            style={{ width: '100%', marginTop: '16px', justifyContent: 'center' }}
            disabled={loading}
          >
            {loading ? 'Procesando...' : (isJoining ? 'Unirse a la Empresa' : 'Crear Espacio de Trabajo')}
          </button>

          <button
            type="button"
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            style={{ 
              width: '100%', 
              background: 'none', 
              border: '1px solid rgba(255,255,255,0.15)', 
              color: 'var(--text-muted)',
              padding: '10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '14px'
            }}
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
