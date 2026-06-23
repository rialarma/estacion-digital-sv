import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { useTenantStore } from './store/useTenantStore';
import { Menu, UserCheck, Truck, FileText } from 'lucide-react';

import Sidebar from './components/Sidebar';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import Historial from './pages/Historial';
import Documents from './pages/Documents';
import Inventory from './pages/Inventory';
import Catalogo from './pages/Catalogo';
import Clients from './pages/Clients';
import Proveedores from './pages/Proveedores';
import Vendedores from './pages/Vendedores';
import Repartidores from './pages/Repartidores';
import Despachos from './pages/Despachos';
import RevisionCargas from './pages/RevisionCargas';
import Configuracion from './pages/Configuracion';
import Reportes from './pages/Reportes';
import CatalogoCuentas from './pages/CatalogoCuentas';
import LibroDiario from './pages/LibroDiario';
import EstadosFinancieros from './pages/EstadosFinancieros';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';

import LibrosIva from './pages/LibrosIva';
import CuentasPorCobrar from './pages/CuentasPorCobrar';
import CuentasPorPagar from './pages/CuentasPorPagar';
import SuspendedSaaS from './pages/SuspendedSaaS';
import ProtectedRoute from './components/ProtectedRoute';
import Caja from './pages/Caja';
import Cotizaciones from './pages/Cotizaciones';
import Kardex from './pages/Kardex';
import Traslados from './pages/Traslados';
import Home from './pages/Home';

function App() {
  const { user, loading } = useAuth();
  const { tenantId, tenantInfo } = useTenantStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // 2.5 SaaS Wall: Si la suscripción está suspendida
  if (tenantInfo?.subscription_status === 'SUSPENDED') {
    return <SuspendedSaaS />;
  }

  // 3. Autenticado y con Tenant -> Aplicación Principal
  return (
    <Router>
      <div className="app-container">
        {/* Mobile Topbar */}
        <div className="mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: 'bold' }}>
            <span style={{ color: 'var(--primary)' }}>Estación</span> Digital SV
          </div>
          <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} />
          </button>
        </div>

        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="modal-backdrop" 
            style={{ zIndex: 99, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <Sidebar 
          onLogout={() => supabase.auth.signOut()} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <main className="main-content">
          <Routes>
            {/* Ruta Principal / Dashboard */}
            <Route path="/" element={<Home />} />
            
            {/* Rutas de Operaciones (Disponibles para Cajeros y superiores) */}
            <Route path="/caja" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Caja /></ProtectedRoute>} />
            <Route path="/ventas" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Ventas /></ProtectedRoute>} />
            <Route path="/cotizaciones" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Cotizaciones /></ProtectedRoute>} />

            
            {/* Rutas de Compras e Inventario (Disponibles para Bodegueros y superiores) */}
            <Route path="/compras" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Compras /></ProtectedRoute>} />
            <Route path="/catalogo" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Catalogo /></ProtectedRoute>} />
            <Route path="/inventario" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO', 'CAJERO']}><Inventory /></ProtectedRoute>} />
            <Route path="/kardex" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Kardex /></ProtectedRoute>} />
            <Route path="/traslados" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Traslados /></ProtectedRoute>} />
            
            {/* Cartera (Cobros y Pagos) */}
            <Route path="/cartera/cxc" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><CuentasPorCobrar /></ProtectedRoute>} />
            <Route path="/cartera/cxp" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><CuentasPorPagar /></ProtectedRoute>} />

            {/* Administracion y Reportes (Solo Admin y Gerente) */}
            <Route path="/firmador" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Documents /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Clients /></ProtectedRoute>} />
            <Route path="/proveedores" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Proveedores /></ProtectedRoute>} />
            <Route path="/vendedores" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Vendedores /></ProtectedRoute>} />
            <Route path="/repartidores" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Repartidores /></ProtectedRoute>} />
            <Route path="/despachos" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Despachos /></ProtectedRoute>} />
            <Route path="/bodega/revision-cargas" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><RevisionCargas /></ProtectedRoute>} />
            <Route path="/historial" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Historial /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Reportes /></ProtectedRoute>} />
            
            {/* Contabilidad y Configuración (Solo ADMIN) */}
            <Route path="/configuracion" element={<ProtectedRoute allowedRoles={['ADMIN']}><Configuracion /></ProtectedRoute>} />
            <Route path="/contabilidad/catalogo" element={<ProtectedRoute allowedRoles={['ADMIN']}><CatalogoCuentas /></ProtectedRoute>} />
            <Route path="/contabilidad/partidas" element={<ProtectedRoute allowedRoles={['ADMIN']}><LibroDiario /></ProtectedRoute>} />
            <Route path="/contabilidad/estados-financieros" element={<ProtectedRoute allowedRoles={['ADMIN']}><EstadosFinancieros /></ProtectedRoute>} />
            <Route path="/contabilidad/libros-iva" element={<ProtectedRoute allowedRoles={['ADMIN']}><LibrosIva /></ProtectedRoute>} />
            
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
