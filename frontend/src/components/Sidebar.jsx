import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
  ShoppingBag, ShoppingCart, FileText, Package, Users, UserCheck, 
  Settings, MonitorDot, LogOut, Store, Truck, ClipboardList, 
  BarChart2, X, BookOpen, ChevronDown, ChevronRight, Briefcase, 
  Layers, Contact, Calculator, ShieldCheck, DollarSign, Monitor, FileSignature, ArrowRightLeft, Home, Clock, Calendar, PieChart, Wrench
} from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';
import { supabase } from '../supabase';

const SidebarGroup = ({ title, icon: Icon, children, currentPath, activePaths, isOpen, onToggle }) => {
  // Auto-expand if the current path exactly matches or is a sub-path (e.g. /catalogo or /catalogo/123)
  const isActiveGroup = activePaths.some(p => currentPath === p || currentPath.startsWith(p + '/'));
  
  // Update state if location changes and enters this group
  useEffect(() => {
    if (isActiveGroup && !isOpen) {
      onToggle(title, true);
    }
  }, [isActiveGroup]);

  // Si no hay hijos válidos para mostrar (todos false/null), ocultar el grupo
  const validChildren = React.Children.toArray(children).filter(child => child);
  if (validChildren.length === 0) return null;

  return (
    <div style={{ marginBottom: '4px' }}>
      <button 
        onClick={() => onToggle(title, !isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: isOpen ? 'rgba(59, 130, 246, 0.05)' : 'none', 
          border: 'none', 
          color: isActiveGroup ? 'var(--primary)' : 'var(--text-muted)',
          padding: '12px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 500,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
           if(!isOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
        }}
        onMouseLeave={(e) => {
           if(!isOpen) e.currentTarget.style.background = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Icon size={20} />
          {title}
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {isOpen && (
        <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
          {validChildren}
        </div>
      )}
    </div>
  );
};

const isPageActive = (tenantInfo, pageId) => {
  return tenantInfo?.active_pages?.[pageId] !== false;
};

const Sidebar = ({ onLogout, isOpen, onClose }) => {
  const { tenantInfo } = useTenantStore();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState('');
  const [role, setRole] = useState(null);
  const [pendingWebOrders, setPendingWebOrders] = useState(0);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
        if (data) setRole(data.role);
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    if (!tenantInfo?.id) return;
    
    // Fetch initial count
    const fetchPendingOrders = async () => {
      const { count } = await supabase
        .from('web_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantInfo.id)
        .in('status', ['PENDING']);
      setPendingWebOrders(count || 0);
    };
    
    fetchPendingOrders();

    // Subscribe to changes
    const subscription = supabase
      .channel('sidebar-web-orders')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'web_orders',
        filter: `tenant_id=eq.${tenantInfo.id}`
      }, () => {
        fetchPendingOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tenantInfo?.id]);

  const handleToggleGroup = (title, state) => {
    if (state) {
      setOpenGroup(title);
    } else if (openGroup === title) {
      setOpenGroup('');
    }
  };

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="mobile-close-btn" onClick={onClose}>
        <X size={24} />
      </button>
      
      {/* Branding */}
      <div className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2em', fontWeight: 'bold', color: 'var(--text-main)', width: '100%' }}>
          {tenantInfo?.logo_url ? (
            <img src={tenantInfo.logo_url} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 }} />
          ) : (
            <Store size={24} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          )}
          <span style={{ display: 'block', wordBreak: 'break-word', lineHeight: '1.2' }}>
            {tenantInfo?.company_name || tenantInfo?.name || 'Mi Empresa'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8em', color: 'var(--text-muted)', fontWeight: 'normal', paddingLeft: tenantInfo?.logo_url ? '42px' : '34px', width: '100%' }}>
          <MonitorDot size={12} style={{ flexShrink: 0, marginTop: '2px' }} /> 
          <span style={{ display: 'block', wordBreak: 'break-word', lineHeight: '1.4' }}>
            Estación Digital SV
          </span>
        </div>
      </div>
      
      {/* Links Container */}
      <div className="sidebar-links">
        <NavLink 
          to="/" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} 
          style={{ marginBottom: '16px' }} 
          onClick={() => {
            setOpenGroup('');
            onClose();
          }} 
          end
        >
          <Home size={18} /> Inicio
        </NavLink>

        <SidebarGroup 
          title="Operaciones" 
          icon={Briefcase} 
          currentPath={location.pathname} 
          activePaths={['/caja', '/ventas', '/preventa', '/compras', '/historial', '/cotizaciones', '/clientes', '/proveedores', '/checkin', '/taller']}
          isOpen={openGroup === 'Operaciones'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'caja') && (
            <NavLink to="/caja" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Monitor size={18} /> Turnos de Caja
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'cotizaciones') && (
            <NavLink to="/cotizaciones" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <FileSignature size={18} /> Docs. Pendientes
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'ventas') && (
            <NavLink to="/ventas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <ShoppingCart size={18} /> Ventas (POS)
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'preventa') && role !== 'CAJERO' && (
            <NavLink to="/preventa" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose} style={{ background: location.pathname === '/preventa' ? '' : 'rgba(16, 185, 129, 0.05)', borderLeft: '2px solid #10b981' }}>
              <ShoppingCart size={18} color="#10b981" /> Preventa Móvil
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'taller') && (
            <NavLink to="/taller" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Wrench size={18} /> Taller / Servicio Técnico
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'pedidos_web') && (
            <NavLink to="/pedidos-web" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShoppingBag size={18} color={pendingWebOrders > 0 ? '#3b82f6' : 'currentColor'} /> Pedidos Web
              </div>
              {pendingWebOrders > 0 && (
                <span style={{ background: '#ef4444', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>
                  {pendingWebOrders}
                </span>
              )}
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'compras') && (
            <NavLink to="/compras" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <ShoppingBag size={18} /> Compras
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'historial') && (
            <NavLink to="/historial" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <ArrowRightLeft size={18} /> Historial Global
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'clientes') && (
            <NavLink to="/clientes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Contact size={18} /> Clientes
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'proveedores') && (
            <NavLink to="/proveedores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Truck size={18} /> Proveedores
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'checkin') && (
            <NavLink to="/checkin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <UserCheck size={18} /> Control de Acceso
            </NavLink>
          )}
        </SidebarGroup>

        <SidebarGroup 
          title="Inventario" 
          icon={Layers} 
          currentPath={location.pathname} 
          activePaths={['/catalogo', '/inventario', '/kardex', '/traslados']}
          isOpen={openGroup === 'Inventario'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'catalogo') && (
            <NavLink to="/catalogo" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Package size={18} /> Catálogo
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'existencias') && (
            <NavLink to="/inventario" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Package size={18} /> Existencias
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'kardex') && (
            <NavLink to="/kardex" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <ClipboardList size={18} /> Historial (Kardex)
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'traslados') && (
            <NavLink to="/traslados" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <ArrowRightLeft size={18} /> Traslados
            </NavLink>
          )}
        </SidebarGroup>

        <SidebarGroup 
          title="Logística" 
          icon={Truck} 
          currentPath={location.pathname} 
          activePaths={['/asignacion-rutas', '/bodega/revision-cargas', '/despachos']}
          isOpen={openGroup === 'Logística'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'asignacion_rutas') && (
            <NavLink to="/asignacion-rutas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Truck size={18} /> Asignación de Rutas
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'revision_cargas') && (
            <NavLink to="/bodega/revision-cargas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Package size={18} /> Revisión de Cargas
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'despachos') && (
            <NavLink to="/despachos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Truck size={18} /> Entregas en Ruta
            </NavLink>
          )}
        </SidebarGroup>


        <SidebarGroup 
          title="Finanzas" 
          icon={DollarSign} 
          currentPath={location.pathname} 
          activePaths={['/cartera/cxc', '/cartera/cxp']}
          isOpen={openGroup === 'Finanzas'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'cxc') && (
            <NavLink to="/cartera/cxc" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <UserCheck size={18} /> Cuentas por Cobrar
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'cxp') && (
            <NavLink to="/cartera/cxp" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Truck size={18} /> Cuentas por Pagar
            </NavLink>
          )}
        </SidebarGroup>

        <SidebarGroup 
          title="Recursos Humanos" 
          icon={Users} 
          currentPath={location.pathname} 
          activePaths={['/rrhh/departamentos', '/rrhh/cargos', '/rrhh/empleados', '/rrhh/asistencia', '/rrhh/vacaciones', '/rrhh/planilla', '/rrhh/reportes']}
          isOpen={openGroup === 'Recursos Humanos'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'departamentos') && (
            <NavLink to="/rrhh/departamentos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Briefcase size={18} /> Departamentos
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'cargos') && (
            <NavLink to="/rrhh/cargos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Contact size={18} /> Cargos (Roles)
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'empleados') && (
            <NavLink to="/rrhh/empleados" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Users size={18} /> Directorio RRHH
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'asistencia_hr') && (
            <NavLink to="/rrhh/asistencia" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Clock size={18} /> Control de Asistencia
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'vacaciones') && (
            <NavLink to="/rrhh/vacaciones" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Calendar size={18} /> Vacaciones
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'planilla') && (
            <NavLink to="/rrhh/planilla" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <FileText size={18} /> Planilla / Nómina
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'reportes_hr') && (
            <NavLink to="/rrhh/reportes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <PieChart size={18} /> Reportes Ley
            </NavLink>
          )}
        </SidebarGroup>

        <SidebarGroup 
          title="Contabilidad" 
          icon={Calculator} 
          currentPath={location.pathname} 
          activePaths={['/contabilidad/catalogo', '/contabilidad/partidas', '/contabilidad/estados-financieros', '/contabilidad/libros-iva', '/firmador']}
          isOpen={openGroup === 'Contabilidad'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'firmador') && (
            <NavLink to="/firmador" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <FileText size={18} /> Firmador DTE
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'catalogo_cuentas') && (
            <NavLink to="/contabilidad/catalogo" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <BookOpen size={18} /> Catálogo Cuentas
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'libro_diario') && (
            <NavLink to="/contabilidad/partidas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <FileText size={18} /> Libro Diario
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'estados_financieros') && (
            <NavLink to="/contabilidad/estados-financieros" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <BarChart2 size={18} /> Est. Financieros
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'libros_iva') && (
            <NavLink to="/contabilidad/libros-iva" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <BookOpen size={18} /> Libros de IVA
            </NavLink>
          )}
        </SidebarGroup>

        <SidebarGroup 
          title="Enlaces Públicos" 
          icon={Monitor} 
          currentPath={location.pathname} 
          activePaths={[]}
          isOpen={openGroup === 'Enlaces Públicos'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'tienda_virtual') && (
            <a href={`/tienda/${tenantInfo?.id}`} target="_blank" rel="noopener noreferrer" className="nav-link" style={{ textDecoration: 'none' }}>
              <ShoppingCart size={18} /> Tienda Virtual
            </a>
          )}
          {isPageActive(tenantInfo, 'kiosko_asistencia') && (
            <a href={`/kiosko/${tenantInfo?.id}`} target="_blank" rel="noopener noreferrer" className="nav-link" style={{ textDecoration: 'none' }}>
              <Clock size={18} /> Kiosko Asistencia
            </a>
          )}
        </SidebarGroup>

        <SidebarGroup 
          title="Administración" 
          icon={Settings} 
          currentPath={location.pathname} 
          activePaths={['/reportes', '/configuracion']}
          isOpen={openGroup === 'Administración'}
          onToggle={handleToggleGroup}
        >
          {isPageActive(tenantInfo, 'reportes') && (
            <NavLink to="/reportes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <BarChart2 size={18} /> Reportes
            </NavLink>
          )}
          {isPageActive(tenantInfo, 'configuracion') && (
            <NavLink to="/configuracion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
              <Settings size={18} /> Configuración
            </NavLink>
          )}
        </SidebarGroup>

      </div>

      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => { onClose?.(); onLogout(); }}
          className="nav-link" 
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: '#f87171' }}
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
