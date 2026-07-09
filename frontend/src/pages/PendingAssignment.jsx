import React from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, LogOut } from 'lucide-react';

const PendingAssignment = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
        <ShieldAlert size={64} style={{ color: 'var(--primary)', marginBottom: '20px' }} />
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Cuenta en Espera</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', lineHeight: '1.5' }}>
          Tu cuenta ha sido creada exitosamente, pero aún no tienes una empresa asignada. 
          Pídele a tu administrador que te envíe un <strong>Link de Invitación</strong> para acceder.
        </p>
        <button 
          onClick={() => supabase.auth.signOut()} 
          className="glass-button" 
          style={{ justifyContent: 'center', width: '100%', background: 'var(--bg-card)' }}
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default PendingAssignment;
