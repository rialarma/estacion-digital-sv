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
            p_address: ''
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
