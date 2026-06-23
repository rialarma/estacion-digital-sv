import React, { useState } from 'react';
import { supabase } from '../supabase';
import { MonitorDot } from 'lucide-react';

const Auth = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // LOGIN
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (loginError) throw loginError;
        if (data.session) {
          window.history.replaceState(null, '', '/');
          if (onAuthSuccess) onAuthSuccess(data.session);
        }

      } else {
        // SIGNUP - Solo crear el usuario en auth.users
        const { data: authData, error: signupError } = await supabase.auth.signUp({
          email,
          password
        });
        if (signupError) throw signupError;

        if (authData.user) {
          if (authData.session) {
            window.history.replaceState(null, '', '/');
            if (onAuthSuccess) onAuthSuccess(authData.session);
          } else {
            setError("Cuenta creada exitosamente. Por favor inicia sesión.");
            setIsLogin(true);
          }
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
          <p style={{ color: 'var(--text-muted)' }}>{isLogin ? 'Ingresa a tu cuenta' : 'Registra tu empresa'}</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Correo Electrónico</label>
            <input required type="email" className="glass-input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Contraseña</label>
            <input required type="password" className="glass-input" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <button type="submit" className="glass-button" style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }} disabled={loading}>
            {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(null); }} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isLogin ? '¿No tienes cuenta? Registra tu empresa' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
