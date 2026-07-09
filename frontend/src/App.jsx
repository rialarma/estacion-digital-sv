import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { useTenantStore } from './store/useTenantStore';
import { Menu, UserCheck, Truck, FileText } from 'lucide-react';

import Topbar from './components/Topbar';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import Storefront from './pages/Storefront/Home';
import Checkout from './pages/Storefront/Checkout';
import StoreProfile from './pages/Storefront/StoreProfile';
const Historial = lazy(() => import('./pages/Historial'));
const Documents = lazy(() => import('./pages/Documents'));
const Inventory = lazy(() => import('./pages/Inventory'));
import Catalogo from './pages/Catalogo';
const Clients = lazy(() => import('./pages/Clients'));
const Proveedores = lazy(() => import('./pages/Proveedores'));
const Despachos = lazy(() => import('./pages/Despachos'));
const CheckIn = lazy(() => import('./pages/CheckIn'));
const AsignacionRutas = lazy(() => import('./pages/AsignacionRutas'));
const RevisionCargas = lazy(() => import('./pages/RevisionCargas'));
const Repartidores = lazy(() => import('./pages/Repartidores'));
const Usuarios = lazy(() => import('./pages/Usuarios'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Reportes = lazy(() => import('./pages/Reportes'));
const Taller = lazy(() => import('./pages/Taller'));
const ConfigCatalogo = lazy(() => import('./pages/CatalogoCuentas'));
const LibroDiario = lazy(() => import('./pages/LibroDiario'));
const EstadosFinancieros = lazy(() => import('./pages/EstadosFinancieros'));
const KioskoAsistencia = lazy(() => import('./pages/KioskoAsistencia'));
import Auth from './pages/Auth';
import PendingAssignment from './pages/PendingAssignment';
import JoinTenant from './pages/JoinTenant';
const GodMode = lazy(() => import('./pages/GodMode'));
const Preventa = lazy(() => import('./pages/Preventa'));
const WebOrders = lazy(() => import('./pages/WebOrders'));

const LibrosIva = lazy(() => import('./pages/LibrosIva'));
const CuentasPorCobrar = lazy(() => import('./pages/CuentasPorCobrar'));
const CuentasPorPagar = lazy(() => import('./pages/CuentasPorPagar'));
const SuspendedSaaS = lazy(() => import('./pages/SuspendedSaaS'));
import ProtectedRoute from './components/ProtectedRoute';
const Caja = lazy(() => import('./pages/Caja'));
const Cotizaciones = lazy(() => import('./pages/Cotizaciones'));
const PedidosPreventa = lazy(() => import('./pages/PedidosPreventa'));
const MiRuta = lazy(() => import('./pages/MiRuta'));
const MapaLogistica = lazy(() => import('./pages/MapaLogistica'));
const Kardex = lazy(() => import('./pages/Kardex'));
const Traslados = lazy(() => import('./pages/Traslados'));
import Home from './pages/Home';
const Asistencia = lazy(() => import('./pages/Asistencia'));
const StorefrontHome = lazy(() => import('./pages/Storefront/Home'));
const StorefrontCheckout = lazy(() => import('./pages/Storefront/Checkout'));

// Módulo HR
const Departamentos = lazy(() => import('./pages/hr/Departamentos'));
const Cargos = lazy(() => import('./pages/hr/Cargos'));
const DirectorioRRHH = lazy(() => import('./pages/hr/DirectorioRRHH'));
const Planilla = lazy(() => import('./pages/hr/Planilla'));

const Vacaciones = lazy(() => import('./pages/hr/Vacaciones'));
import GPSBackgroundTracker from './components/GPSBackgroundTracker';
const ReportesHR = lazy(() => import('./pages/hr/ReportesHR'));
import SubNavTabs from './components/SubNavTabs';
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

    // 2. Configurar Pestaña (Título y Favicon) y PWA Manifest
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

        // Inyectar Manifest dinámico para PWA
        let manifestLink = document.querySelector("link[rel='manifest']");
        if (!manifestLink) {
          manifestLink = document.createElement('link');
          manifestLink.rel = 'manifest';
          document.head.appendChild(manifestLink);
        }
        const manifest = {
          name: tenantInfo.name || "Estación Digital",
          short_name: tenantInfo.name || "ED",
          start_url: "/",
          display: "standalone",
          background_color: "#0f172a",
          theme_color: "#10b981",
          icons: [
            {
              src: tenantInfo.logo_url,
              sizes: "192x192",
              type: "image/png"
            },
            {
              src: tenantInfo.logo_url,
              sizes: "512x512",
              type: "image/png"
            }
          ]
        };
        manifestLink.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
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
          <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando tienda...</div>}>
            <Routes>
              <Route path="/" element={<Storefront customTenantId={customDomainTenantId} />} />
              <Route path="/checkout" element={<Checkout customTenantId={customDomainTenantId} />} />
              <Route path="/perfil" element={<StoreProfile customTenantId={customDomainTenantId} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </Router>
      );
    }
  }

  // 0.5 Rutas Públicas (Tienda Virtual por URL estándar) o Kiosko
  if (isPublicStoreRoute || isPublicKioskRoute) {
    return (
      <Router>
        <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando tienda...</div>}>
          <Routes>
            {/* Rutas Públicas (Tienda Virtual) */}
            <Route path="/tienda/:tenantId" element={<Storefront />} />
            <Route path="/tienda/:tenantId/checkout" element={<Checkout />} />
            <Route path="/tienda/:tenantId/perfil" element={<StoreProfile />} />
            <Route path="/kiosko/:tenantId" element={<KioskoAsistencia />} />
          </Routes>
        </Suspense>
      </Router>
    );
  }

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando sistema...</div>;
  }

  // 1. Rutas de Invitación (debe evaluarse antes del bloqueo de login)
  if (window.location.pathname.startsWith('/join')) {
    return (
      <Router>
        <Routes>
          <Route path="/join/:inviteCode" element={<JoinTenant />} />
        </Routes>
      </Router>
    );
  }

  // 2. Si no hay usuario autenticado -> Login
  if (!user) {
    return <Auth />;
  }

  const isGodModeAdmin = user?.email === 'raam2508@gmail.com' || user?.email === 'admin@estaciondigital.sv';

  // 3. Si el usuario está autenticado pero no tiene Empresa (Tenant) -> Cuenta en Espera
  // Excepto si está intentando acceder a God Mode
  const isGodModeRoute = window.location.pathname === '/godmode';
  if (user && !tenantId && !isGodModeRoute) {
    if (isGodModeAdmin) {
      window.location.href = '/godmode';
      return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Redirigiendo a God Mode...</div>;
    }
    return <PendingAssignment />;
  }

  // 2.5 SaaS Wall: Si la suscripción está suspendida
  if (tenantInfo?.subscription_status === 'SUSPENDED') {
    return <SuspendedSaaS />;
  }

  const isImpersonating = isGodModeAdmin && tenantId && !isGodModeRoute;

  const handleExitSupport = async () => {
    try {
      const { error } = await supabase.rpc('admin_exit_support');
      if (error) throw error;
      window.location.href = '/godmode';
    } catch (err) {
      console.error(err);
      alert('Error al salir de soporte: ' + err.message);
    }
  };

  // 3. Autenticado y con Tenant -> Aplicación Principal
  return (
    <Router>
      <GPSBackgroundTracker />
      
      {isImpersonating && (
        <button 
          onClick={handleExitSupport}
          style={{
            position: 'fixed', bottom: '20px', left: '20px', zIndex: 9999,
            background: '#ef4444', color: 'white', padding: '12px 20px',
            borderRadius: '30px', border: 'none', fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          Salir de Soporte ❌
        </button>
      )}

      <div className="app-container">
        <Topbar onLogout={() => supabase.auth.signOut()} />
        
        <main className="main-content">
          <SubNavTabs />
          <Suspense fallback={<div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>Cargando pantalla...</div>}>
            <Routes>
              {/* Ruta Principal / Dashboard */}
              <Route path="/" element={<Home />} />
              
              {/* Rutas de Operaciones (Disponibles para Cajeros y superiores) */}
              <Route path="/caja" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Caja /></ProtectedRoute>} />
              <Route path="/ventas" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Ventas /></ProtectedRoute>} />
              <Route path="/preventa" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'VENDEDOR']}><Preventa /></ProtectedRoute>} />
              <Route path="/pedidos-preventa" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><PedidosPreventa /></ProtectedRoute>} />
              <Route path="/pedidos-web" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO', 'BODEGUERO']}><WebOrders /></ProtectedRoute>} />
              <Route path="/cotizaciones" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Cotizaciones /></ProtectedRoute>} />
              <Route path="/taller" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO', 'TECNICO']}><Taller /></ProtectedRoute>} />

              
              {/* Rutas de Compras e Inventario (Disponibles para Bodegueros y superiores) */}
              <Route path="/compras" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Compras /></ProtectedRoute>} />
              <Route path="/catalogo" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Catalogo /></ProtectedRoute>} />
              <Route path="/inventario" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO', 'CAJERO']}><Inventory /></ProtectedRoute>} />
              <Route path="/kardex" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Kardex /></ProtectedRoute>} />
              <Route path="/traslados" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Traslados /></ProtectedRoute>} />
              <Route path="/despachos" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Despachos /></ProtectedRoute>} />
              <Route path="/repartidores" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Repartidores /></ProtectedRoute>} />
              <Route path="/mi-ruta" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'REPARTIDOR']}><MiRuta /></ProtectedRoute>} />
              <Route path="/mapa-logistica" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><MapaLogistica /></ProtectedRoute>} />
              
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
              <Route path="/logistica/repartidores" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'BODEGUERO']}><Repartidores /></ProtectedRoute>} />
              <Route path="/historial" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO']}><Historial /></ProtectedRoute>} />
              <Route path="/reportes" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Reportes /></ProtectedRoute>} />
              
              {/* Control de Asistencia */}
              <Route path="/rrhh/asistencia" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE', 'CAJERO', 'BODEGUERO']}><Asistencia /></ProtectedRoute>} />
              
              {/* Recursos Humanos (RRHH) */}
              <Route path="/rrhh/departamentos" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Departamentos /></ProtectedRoute>} />
              <Route path="/rrhh/cargos" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Cargos /></ProtectedRoute>} />
              <Route path="/rrhh/empleados" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><DirectorioRRHH /></ProtectedRoute>} />

              <Route path="/rrhh/vacaciones" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Vacaciones /></ProtectedRoute>} />
              <Route path="/rrhh/planilla" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Planilla /></ProtectedRoute>} />
              <Route path="/rrhh/reportes" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><ReportesHR /></ProtectedRoute>} />
              
              {/* Contabilidad y Configuración (Solo ADMIN) */}
              <Route path="/configuracion" element={<ProtectedRoute allowedRoles={['ADMIN']}><Configuracion /></ProtectedRoute>} />
              <Route path="/configuracion/usuarios" element={<ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><Usuarios /></ProtectedRoute>} />
              <Route path="/contabilidad/catalogo" element={<ProtectedRoute allowedRoles={['ADMIN']}><ConfigCatalogo /></ProtectedRoute>} />
              <Route path="/contabilidad/partidas" element={<ProtectedRoute allowedRoles={['ADMIN']}><LibroDiario /></ProtectedRoute>} />
              <Route path="/contabilidad/estados-financieros" element={<ProtectedRoute allowedRoles={['ADMIN']}><EstadosFinancieros /></ProtectedRoute>} />
              <Route path="/contabilidad/libros-iva" element={<ProtectedRoute allowedRoles={['ADMIN']}><LibrosIva /></ProtectedRoute>} />
              
              {/* Super Admin God Mode (Ruta Oculta) */}
              <Route path="/godmode" element={<GodMode />} />

              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;
