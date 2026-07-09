import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Monitor, ShoppingCart, FileSignature, Wrench, Contact, Building2, Receipt, Settings, Store, UserCheck, LayoutDashboard, PieChart, Package, Truck, Users, Clock, Calendar, FileText, ArrowRightLeft, Map, ClipboardList, BookOpen, ShieldCheck } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

const MENU_GROUPS = [
  {
    title: 'Ventas & Facturación',
    paths: ['/caja', '/ventas', '/preventa', '/cotizaciones', '/pedidos-preventa', '/taller', '/clientes'],
    tabs: [
      { path: '/caja', label: 'Turnos de Caja', icon: Monitor, key: 'caja' },
      { path: '/ventas', label: 'Ventas (POS)', icon: ShoppingCart, key: 'ventas' },
      { path: '/preventa', label: 'Preventa Móvil', icon: ShoppingCart, key: 'preventa' },
      { path: '/cotizaciones', label: 'Cotizaciones', icon: FileSignature, key: 'cotizaciones' },
      { path: '/pedidos-preventa', label: 'Pedidos Preventa', icon: ShoppingCart, key: 'cotizaciones' },
      { path: '/taller', label: 'Taller', icon: Wrench, key: 'taller' },
      { path: '/clientes', label: 'Clientes', icon: Contact, key: 'clientes' }
    ]
  },
  {
    title: 'Compras',
    paths: ['/compras', '/proveedores'],
    tabs: [
      { path: '/compras', label: 'Compras', icon: ShoppingCart, key: 'compras' },
      { path: '/proveedores', label: 'Proveedores', icon: Truck, key: 'proveedores' }
    ]
  },
  {
    title: 'Inventario',
    paths: ['/catalogo', '/inventario', '/kardex', '/traslados'],
    tabs: [
      { path: '/catalogo', label: 'Catálogo', icon: Package, key: 'catalogo' },
      { path: '/inventario', label: 'Existencias', icon: Package, key: 'existencias' },
      { path: '/kardex', label: 'Kardex', icon: ClipboardList, key: 'kardex' },
      { path: '/traslados', label: 'Traslados', icon: ArrowRightLeft, key: 'traslados' }
    ]
  },
  {
    title: 'Logística',
    paths: ['/asignacion-rutas', '/bodega/revision-cargas', '/despachos', '/repartidores', '/mapa-logistica', '/mi-ruta'],
    tabs: [
      { path: '/mapa-logistica', label: 'Mapa Logística', icon: Map, key: 'mapa_logistica' },
      { path: '/asignacion-rutas', label: 'Asignación Rutas', icon: Truck, key: 'asignacion_rutas' },
      { path: '/bodega/revision-cargas', label: 'Revisión Cargas', icon: Package, key: 'revision_cargas' },
      { path: '/despachos', label: 'Entregas Ruta', icon: Truck, key: 'despachos' },
      { path: '/repartidores', label: 'Repartidores', icon: Users, key: 'repartidores' },
      { path: '/mi-ruta', label: 'Mi Ruta Móvil', icon: Truck, key: 'mi_ruta' }
    ]
  },
  {
    title: 'RRHH',
    paths: ['/rrhh/departamentos', '/rrhh/cargos', '/rrhh/empleados', '/rrhh/asistencia', '/rrhh/vacaciones', '/rrhh/planilla', '/rrhh/reportes'],
    tabs: [
      { path: '/rrhh/departamentos', label: 'Departamentos', icon: Building2, key: 'departamentos' },
      { path: '/rrhh/cargos', label: 'Cargos', icon: Contact, key: 'cargos' },
      { path: '/rrhh/empleados', label: 'Directorio', icon: Users, key: 'empleados' },
      { path: '/rrhh/asistencia', label: 'Asistencia', icon: Clock, key: 'asistencia_hr' },
      { path: '/rrhh/vacaciones', label: 'Vacaciones', icon: Calendar, key: 'vacaciones' },
      { path: '/rrhh/planilla', label: 'Planilla', icon: FileText, key: 'planilla' },
      { path: '/rrhh/reportes', label: 'Reportes Ley', icon: PieChart, key: 'reportes_hr' }
    ]
  },
  {
    title: 'Finanzas',
    paths: ['/cartera/cxc', '/cartera/cxp'],
    tabs: [
      { path: '/cartera/cxc', label: 'Cuentas por Cobrar', icon: UserCheck, key: 'cxc' },
      { path: '/cartera/cxp', label: 'Cuentas por Pagar', icon: Truck, key: 'cxp' }
    ]
  },
  {
    title: 'Contabilidad',
    paths: ['/contabilidad/catalogo', '/contabilidad/partidas', '/contabilidad/estados-financieros', '/contabilidad/libros-iva', '/firmador'],
    tabs: [
      { path: '/firmador', label: 'Firmador DTE', icon: FileText, key: 'firmador' },
      { path: '/contabilidad/catalogo', label: 'Catálogo', icon: BookOpen, key: 'catalogo_cuentas' },
      { path: '/contabilidad/partidas', label: 'Libro Diario', icon: FileText, key: 'libro_diario' },
      { path: '/contabilidad/estados-financieros', label: 'Est. Financieros', icon: PieChart, key: 'estados_financieros' },
      { path: '/contabilidad/libros-iva', label: 'Libros IVA', icon: BookOpen, key: 'libros_iva' }
    ]
  },
  {
    title: 'Auditoría',
    paths: ['/historial', '/checkin'],
    tabs: [
      { path: '/historial', label: 'Historial', icon: ArrowRightLeft, key: 'historial' },
      { path: '/checkin', label: 'Control Acceso', icon: ShieldCheck, key: 'checkin' }
    ]
  }
];

const SubNavTabs = () => {
  const location = useLocation();
  const { tenantInfo } = useTenantStore();

  if (!tenantInfo) return null;

  const activeGroup = MENU_GROUPS.find(group => 
    group.paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))
  );

  if (!activeGroup) return null;

  const activeTabs = activeGroup.tabs.filter(tab => {
    if (tab.key === 'mi_ruta') return true;
    if (tab.key === 'mapa_logistica') return true;
    return tenantInfo.active_pages?.[tab.key] !== false;
  });

  if (activeTabs.length <= 1) return null;

  return (
    <div style={{ 
      paddingBottom: '8px', 
      marginBottom: '20px', 
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: '0',
      zIndex: 40,
      background: 'var(--bg-main)',
      paddingTop: '20px'
    }}>
      <div style={{ 
        display: 'flex', 
        overflowX: 'auto', 
        gap: '8px', 
      }} className="hide-scrollbar">
        {activeTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path || location.pathname.startsWith(tab.path + '/');
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px', border: 'none',
                background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            >
              <Icon size={18} />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default SubNavTabs;
