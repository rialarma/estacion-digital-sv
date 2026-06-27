import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { ShieldAlert } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

const routeToPageMap = {
  '/caja': 'caja',
  '/cotizaciones': 'cotizaciones',
  '/ventas': 'ventas',
  '/preventa': 'preventa',
  '/pedidos-web': 'pedidos_web',
  '/compras': 'compras',
  '/historial': 'historial',
  '/clientes': 'clientes',
  '/proveedores': 'proveedores',
  '/checkin': 'checkin',
  '/catalogo': 'catalogo',
  '/inventario': 'existencias',
  '/kardex': 'kardex',
  '/traslados': 'traslados',
  '/asignacion-rutas': 'asignacion_rutas',
  '/bodega/revision-cargas': 'revision_cargas',
  '/despachos': 'despachos',
  '/cartera/cxc': 'cxc',
  '/cartera/cxp': 'cxp',
  '/rrhh/departamentos': 'departamentos',
  '/rrhh/cargos': 'cargos',
  '/rrhh/empleados': 'empleados',
  '/rrhh/asistencia': 'asistencia_hr',
  '/rrhh/vacaciones': 'vacaciones',
  '/rrhh/planilla': 'planilla',
  '/rrhh/reportes': 'reportes_hr',
  '/firmador': 'firmador',
  '/contabilidad/catalogo': 'catalogo_cuentas',
  '/contabilidad/partidas': 'libro_diario',
  '/contabilidad/estados-financieros': 'estados_financieros',
  '/contabilidad/libros-iva': 'libros_iva',
  '/reportes': 'reportes',
  '/configuracion': 'configuracion'
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const { tenantInfo } = useTenantStore();

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_profiles')
        .select('role, tenant_id')
        .eq('id', user.id)
        .single();
        
      if (data) {
        setRole(data.role);
        
        // Comprobar suscripción SaaS
        if (data.tenant_id) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('subscription_status')
            .eq('id', data.tenant_id)
            .single();
            
          if (tenantData && tenantData.subscription_status === 'SUSPENDED') {
            setRole('SUSPENDED');
          }
        }
      }
      setLoading(false);
    };
    
    fetchRole();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center' }}>Verificando accesos...</div>;
  }

  if (!role) {
    return <Navigate to="/" replace />;
  }

  if (role === 'SUSPENDED') {
    return <Navigate to="/suspendido" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
        <ShieldAlert size={64} style={{ color: '#ef4444', marginBottom: '16px' }} />
        <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Acceso Restringido</h2>
        <p>Tu rol ({role}) no tiene permisos para ver esta pantalla.</p>
      </div>
    );
  }

  // Verificación de página activa basada en la URL actual
  if (tenantInfo) {
    const path = location.pathname;
    let pageId = null;
    
    // Buscar si la ruta actual (exacta o prefijo) pertenece a una página desactivada
    for (const [route, id] of Object.entries(routeToPageMap)) {
      if (path === route || path.startsWith(route + '/')) {
        pageId = id;
        break;
      }
    }

    if (pageId && tenantInfo.active_pages && tenantInfo.active_pages[pageId] === false) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
          <ShieldAlert size={64} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ color: 'var(--text-main)', marginBottom: '8px' }}>Módulo Desactivado</h2>
          <p>Esta sección se encuentra desactivada para tu empresa.</p>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
