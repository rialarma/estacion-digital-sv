import React, { useState } from 'react';
import { supabase } from '../supabase';
import { MonitorDot } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const hasInvite = !!localStorage.getItem('pendingInviteCode');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleAuthSuccess = (session) => {
    const pendingCode = localStorage.getItem('pendingInviteCode');
    if (pendingCode) {
      window.location.href = `/join/${pendingCode}`;
    } else {
      window.history.replaceState(null, '', '/');
      if (onAuthSuccess) onAuthSuccess(session);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isForgotPassword) {
        // FORGOT PASSWORD
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/update-password`,
        });
        if (resetError) throw resetError;
        setMessage("Se han enviado las instrucciones de recuperación a tu correo.");
        setEmail('');
      } else {
        // LOGIN
        let loginEmail = email.trim();
        
        // Si no tiene '@', es un nombre de usuario. Consultar el correo real.
        if (!loginEmail.includes('@')) {
          const { data: realEmail, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: loginEmail.toLowerCase() });
          if (rpcError || !realEmail) {
            throw new Error('Usuario no encontrado o contraseña incorrecta');
          }
          loginEmail = realEmail;
        }

        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password
        });
        if (loginError) throw loginError;
        if (data.session) {
          handleAuthSuccess(data.session);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <MonitorDot size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Estación Digital SV</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {isForgotPassword ? 'Recuperar Contraseña' : 'Ingresa a tu cuenta'}
          </p>
        </div>
        
        {hasInvite && !isForgotPassword && (
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            Tienes una invitación pendiente. Por favor <strong>Inicia Sesión</strong> para aceptarla.
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{!isForgotPassword ? 'Usuario o Correo Electrónico' : 'Correo Electrónico'}</label>
            <input required type={!isForgotPassword ? 'text' : 'email'} className="glass-input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {!isForgotPassword && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Contraseña</label>
              <input required type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          )}

          <button type="submit" className="glass-button" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Cargando...' : (isForgotPassword ? 'Enviar Enlace de Recuperación' : 'Iniciar Sesión')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isForgotPassword ? (
            <button 
              type="button" 
              onClick={() => { setIsForgotPassword(false); setError(null); setMessage(null); }} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Volver al inicio de sesión
            </button>
          ) : (
            <button 
              type="button" 
              onClick={() => { setIsForgotPassword(true); setError(null); setMessage(null); }} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
