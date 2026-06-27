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
import Despachos from './pages/Despachos';
import CheckIn from './pages/CheckIn';
import AsignacionRutas from './pages/AsignacionRutas';
import RevisionCargas from './pages/RevisionCargas';
import Configuracion from './pages/Configuracion';
import Reportes from './pages/Reportes';
import ConfigCatalogo from './pages/CatalogoCuentas';
import LibroDiario from './pages/LibroDiario';
import EstadosFinancieros from './pages/EstadosFinancieros';
import KioskoAsistencia from './pages/KioskoAsistencia';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import GodMode from './pages/GodMode';
import Preventa from './pages/Preventa';
import WebOrders from './pages/WebOrders';

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
import Asistencia from './pages/Asistencia';
import StorefrontHome from './pages/Storefront/Home';
import StorefrontCheckout from './pages/Storefront/Checkout';

// Módulo HR
import Departamentos from './pages/hr/Departamentos';
import Cargos from './pages/hr/Cargos';
import DirectorioRRHH from './pages/hr/DirectorioRRHH';
import Planilla from './pages/hr/Planilla';
import AsistenciaHR from './pages/hr/AsistenciaHR';
import Vacaciones from './pages/hr/Vacaciones';
import ReportesHR from './pages/hr/ReportesHR';

function App() {
  const { user, loading } = useAuth();
  const { tenantId, tenantInfo } = useTenantStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customDomainTenantId, setCustomDomainTenantId] = useState(null);
  const [checkingDomain, setCheckingDomain] = useState(true);

  const isPublicStoreRoute = window.location.pathname.startsWith('/tienda');
  const isPublicKioskRoute = window.location.pathname.startsWith('/kiosko');

  useEffect(() => {
    const hostname = window.location.hostname;
    // Ignoramos localhost y dominios base conocidos
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('tuerp.com') || hostname.includes('vercel.app')) {
      setCheckingDomain(false);
      return;
    }

    const checkDomain = async () => {
      try {
        const { data, error } = await supabase.rpc('get_tenant_by_domain', { p_domain: hostname });
        if (data && data.id) {
          setCustomDomainTenantId(data.id);
        }
      } catch (err) {
        console.error("Error validando dominio", err);
      } finally {
        setCheckingDomain(false);
      }
    };
    
    checkDomain();
  }, []);

  useEffect(() => {
    // 1. Configurar Tema
    if (!isPublicStoreRoute && !customDomainTenantId && !isPublicKioskRoute) {
      const theme = tenantInfo?.theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
    } else if (isPublicStoreRoute || customDomainTenantId) {
      // Force light theme for storefront
      document.documentElement.setAttribute('data-theme', 'light');
    }

    // 2. Configurar Pestaña (Título y Favicon)
    if (tenantInfo) {
      document.title = tenantInfo.name || "Estación Digital SV";
      if (tenantInfo.logo_url) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = tenantInfo.logo_url;
      }
    } else {
      document.title = "Estación Digital SV";
      const link = document.querySelector("link[rel~='icon']");
      if (link) link.href = "/vite.svg";
    }
  }, [tenantInfo, isPublicStoreRoute, customDomainTenantId, isPublicKioskRoute]);

  if (checkingDomain) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando tienda...</div>;
  }

  // 0. Rutas Públicas (Tienda Virtual por Custom Domain)
  if (customDomainTenantId) {
    const isLoginPath = window.location.pathname.startsWith('/login');
    if (!isLoginPath) {
      return (
        <Router>
          <Routes>
            <Route path="/" element={<StorefrontHome customTenantId={customDomainTenantId} />} />
            <Route path="/checkout" element={<StorefrontCheckout customTenantId={customDomainTenantId} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      );
    }
  }

  // 0.5 Rutas Públicas (Tienda Virtual por URL estándar) o Kiosko
  if (isPublicStoreRoute || isPublicKioskRoute) {
    return (
      <Router>
        <Routes>
          <Route path="/tienda/:tenantId" element={<StorefrontHome />} />
          <Route path="/tienda/:tenantId/checkout" element={<StorefrontCheckout />} />
          <Route path="/kiosko/:tenantId" element={<KioskoAsistencia />} />
        </Routes>
      </Router>
    );
  }

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando sistema...</div>;
  }

  // 1. Si no hay usuario autenticado -> Login
  if (!user) {
    return <Auth />;
  }

  // 2. Si el usuario está autenticado pero no tiene Empresa (Tenant) -> Onboarding
  // Excepto si está intentando acceder a God Mode
  const isGodModeRoute = window.location.pathname === '/godmode';
  if (user && !tenantId && !isGodModeRoute) {
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
        <div className="mobile-topbar" style={{ overflow: 'hidden', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '1.2em', fontWeight: 'bold', width: '100%' }}>
            <span style={{ color: 'var(--primary)', flexShrink: 0 }}>Estación</span> 
            <span style={{ display: 'block', wordBreak: 'break-word', lineHeight: '1.4' }}>Digital SV</span>
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
            <Route path="/preventa" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'VENDEDOR']}><Preventa /></ProtectedRoute>} />
            <Route path="/pedidos-web" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO', 'BODEGUERO']}><WebOrders /></ProtectedRoute>} />
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
            <Route path="/checkin" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><CheckIn /></ProtectedRoute>} />
            <Route path="/proveedores" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Proveedores /></ProtectedRoute>} />
            <Route path="/asignacion-rutas" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><AsignacionRutas /></ProtectedRoute>} />
            <Route path="/despachos" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Despachos /></ProtectedRoute>} />
            <Route path="/bodega/revision-cargas" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><RevisionCargas /></ProtectedRoute>} />
            <Route path="/historial" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Historial /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Reportes /></ProtectedRoute>} />
            
            {/* Control de Asistencia */}
            <Route path="/asistencia" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO', 'BODEGUERO']}><Asistencia /></ProtectedRoute>} />
            
            {/* Recursos Humanos (RRHH) */}
            <Route path="/rrhh/departamentos" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Departamentos /></ProtectedRoute>} />
            <Route path="/rrhh/cargos" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Cargos /></ProtectedRoute>} />
            <Route path="/rrhh/empleados" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><DirectorioRRHH /></ProtectedRoute>} />
            <Route path="/rrhh/asistencia" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><AsistenciaHR /></ProtectedRoute>} />
            <Route path="/rrhh/vacaciones" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Vacaciones /></ProtectedRoute>} />
            <Route path="/rrhh/planilla" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Planilla /></ProtectedRoute>} />
            <Route path="/rrhh/reportes" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><ReportesHR /></ProtectedRoute>} />
            
            {/* Contabilidad y Configuración (Solo ADMIN) */}
            <Route path="/configuracion" element={<ProtectedRoute allowedRoles={['ADMIN']}><Configuracion /></ProtectedRoute>} />
            <Route path="/contabilidad/catalogo" element={<ProtectedRoute allowedRoles={['ADMIN']}><ConfigCatalogo /></ProtectedRoute>} />
            <Route path="/contabilidad/partidas" element={<ProtectedRoute allowedRoles={['ADMIN']}><LibroDiario /></ProtectedRoute>} />
            <Route path="/contabilidad/estados-financieros" element={<ProtectedRoute allowedRoles={['ADMIN']}><EstadosFinancieros /></ProtectedRoute>} />
            <Route path="/contabilidad/libros-iva" element={<ProtectedRoute allowedRoles={['ADMIN']}><LibrosIva /></ProtectedRoute>} />
            
            {/* Super Admin God Mode (Ruta Oculta) */}
            <Route path="/godmode" element={<GodMode />} />

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
