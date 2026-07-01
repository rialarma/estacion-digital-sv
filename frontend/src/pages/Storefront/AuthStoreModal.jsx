import React, { useState } from 'react';
import { supabase } from '../../supabase';
import { X, Mail, Lock, User, Phone } from 'lucide-react';
import './AuthStoreModal.css';

const AuthStoreModal = ({ tenantId, isOpen, onClose, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) throw error;
        
        onLoginSuccess(data.user);
        onClose();
      } else {
        // Register
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              name: formData.name,
              phone: formData.phone
            }
          }
        });
        
        if (error) throw error;

        if (data.user) {
          // Register the store customer profile using RPC
          const { error: rpcError } = await supabase.rpc('register_store_customer', {
            p_tenant_id: tenantId,
            p_name: formData.name,
            p_phone: formData.phone,
            p_address: '',
            p_email: formData.email
          });
          if (rpcError) console.error("Error creating customer profile:", rpcError);
          
          alert('¡Cuenta creada exitosamente!');
          onLoginSuccess(data.user);
          onClose();
        }
      }
    } catch (err) {
      alert(err.message || 'Error en la autenticación');
    } finally {
      setLoading(false);
    }
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/tienda/${tenantId}/checkout`
        }
      });
      if (error) throw error;
    } catch (err) {
      alert(err.message || 'Error al conectar con Google');
      setLoading(false);
    }
  };

  return (
    <div className="sf-auth-modal-overlay">
      <div className="sf-auth-modal">
        <button className="sf-auth-close" onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="sf-auth-header">
          <h2>{isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
          <p>{isLogin ? 'Ingresa para comprar más rápido' : 'Únete y guarda tus datos de envío'}</p>
        </div>

        <form onSubmit={handleSubmit} className="sf-auth-form">
          {!isLogin && (
            <>
              <div className="sf-input-group">
                <User size={20} />
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Nombre completo" 
                  required 
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div className="sf-input-group">
                <Phone size={20} />
                <input 
                  type="tel" 
                  name="phone" 
                  placeholder="Teléfono (Ej: 7777-7777)" 
                  required 
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>
            </>
          )}

          <div className="sf-input-group">
            <Mail size={20} />
            <input 
              type="email" 
              name="email" 
              placeholder="Correo electrónico" 
              required 
              value={formData.email}
              onChange={handleInputChange}
            />
          </div>

          <div className="sf-input-group">
            <Lock size={20} />
            <input 
              type="password" 
              name="password" 
              placeholder="Contraseña" 
              required 
              value={formData.password}
              onChange={handleInputChange}
            />
          </div>

          <button type="submit" className="sf-auth-submit" disabled={loading}>
            {loading ? 'Procesando...' : (isLogin ? 'Ingresar' : 'Registrarme')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
          <span style={{ padding: '0 1rem', color: '#64748b', fontSize: '0.875rem' }}>O</span>
          <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
        </div>

        <button 
          type="button" 
          onClick={handleGoogleLogin} 
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', color: '#334155', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
              <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
              <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
              <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
            </g>
          </svg>
          Continuar con Google
        </button>

        <div className="sf-auth-footer">
          <button 
            type="button" 
            className="sf-auth-switch" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthStoreModal;
