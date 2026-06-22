import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { useTenantStore } from './store/useTenantStore';

import Sidebar from './components/Sidebar';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import HistorialVentas from './pages/HistorialVentas';
import Documents from './pages/Documents';
import Inventory from './pages/Inventory';
import Catalogo from './pages/Catalogo';
import Clients from './pages/Clients';
import Proveedores from './pages/Proveedores';
import Vendedores from './pages/Vendedores';
import Configuracion from './pages/Configuracion';
import Reportes from './pages/Reportes';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';

function App() {
  const { user, loading } = useAuth();
  const { tenantId, tenantInfo } = useTenantStore();

  useEffect(() => {
    if (tenantInfo?.theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [tenantInfo?.theme]);

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando sistema...</div>;
  }

  // 1. Si no hay usuario autenticado -> Login
  if (!user) {
    return <Auth />;
  }

  // 2. Si el usuario está autenticado pero no tiene Empresa (Tenant) -> Onboarding
  if (user && !tenantId) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  // 3. Autenticado y con Tenant -> Aplicación Principal
  return (
    <Router>
      <div className="app-container">
        <Sidebar onLogout={() => supabase.auth.signOut()} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/ventas" replace />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/historial-ventas" element={<HistorialVentas />} />
            <Route path="/firmador" element={<Documents />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/inventario" element={<Inventory />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/proveedores" element={<Proveedores />} />
            <Route path="/vendedores" element={<Vendedores />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/configuracion" element={<Configuracion />} />
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/ventas" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
