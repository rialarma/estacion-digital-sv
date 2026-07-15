import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, ShoppingCart, FileText, Package, Users, UserCheck, 
  Settings, MonitorDot, LogOut, Store, Truck, ClipboardList, 
  BarChart2, X, BookOpen, ChevronDown, Briefcase, 
  Layers, Contact, Calculator, ShieldCheck, DollarSign, Monitor, FileSignature, ArrowRightLeft, Home, Clock, Calendar, PieChart, Wrench, Map, Menu, LayoutDashboard, Building2, Receipt
} from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';
import { supabase } from '../supabase';

const TopbarDropdown = ({ title, icon: Icon, children, currentPath, activePaths, isOpen, onToggle }) => {
  const dropdownRef = useRef(null);
  
  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(title, false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onToggle, title]);

  const isActiveGroup = activePaths.some(p => currentPath === p || currentPath.startsWith(p + '/'));
  
  const validChildren = React.Children.toArray(children).filter(child => child);
  if (validChildren.length === 0) return null;

  return (
    <div className="topbar-item" ref={dropdownRef}>
      <div 
        className={`topbar-link ${isActiveGroup || isOpen ? 'active' : ''}`}
        onClick={() => onToggle(title, !isOpen)}
      >
        <Icon size={18} />
        {title}
        <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>
      
      {isOpen && (
        <div className="topbar-dropdown" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {validChildren}
        </div>
      )}
    </div>
  );
};

const isPageActive = (tenantInfo, pageId) => {
  return tenantInfo?.active_pages?.[pageId] !== false;
};

const Topbar = ({ onLogout }) => {
  const { tenantInfo } = useTenantStore();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState('');
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [pendingWebOrders, setPendingWebOrders] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getTabClass = (basePath, tabName, defaultTab) => {
    const isBase = location.pathname === basePath;
    const isMatch = location.search === `?tab=${tabName}` || (location.search === '' && tabName === defaultTab);
    return `topbar-dropdown-item ${isBase && isMatch ? 'active' : ''}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('user_profiles').select('role, full_name').eq('id', user.id).single();
        if (data) {
          setRole(data.role);
          setUserName(data.full_name || user.email);
        }
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!tenantInfo?.id) return;
    const fetchPendingOrders = async () => {
      const { count } = await supabase
        .from('web_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantInfo.id)
        .in('status', ['PENDING']);
      setPendingWebOrders(count || 0);
    };
    fetchPendingOrders();
    const subscription = supabase
      .channel('topbar-web-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'web_orders', filter: `tenant_id=eq.${tenantInfo.id}` }, () => {
        fetchPendingOrders();
      }).subscribe();
    return () => supabase.removeChannel(subscription);
  }, [tenantInfo?.id]);

  const handleToggleGroup = (title, state) => {
    if (state) setOpenGroup(title);
    else if (openGroup === title) setOpenGroup('');
  };

  const closeMenu = () => {
    setOpenGroup('');
    setIsMobileOpen(false);
  };

  return (
    <nav className="topbar">
      {/* Branding */}
      <div className="topbar-logo">
        {tenantInfo?.logo_url ? (
          <img src={tenantInfo.logo_url} alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }} />
        ) : (
          <Store size={24} style={{ color: 'var(--primary)' }} />
        )}
        <span>{tenantInfo?.company_name || tenantInfo?.name || 'Mi Empresa'}</span>
      </div>
      
      {/* Mobile Toggle */}
      <button className="mobile-menu-toggle" onClick={() => setIsMobileOpen(!isMobileOpen)}>
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Menus and Profile */}
      <div className={`topbar-menu ${isMobileOpen ? 'open' : ''}`}>
        {/* Navigation */}
        <div className="topbar-nav" style={{ flex: 1, justifyContent: 'center' }}>
        <NavLink to="/" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`} onClick={closeMenu} end>
          <Home size={18} /> Inicio
        </NavLink>

        {role === 'REPARTIDOR' ? (
          <NavLink to="/mi-ruta" className={({ isActive }) => `topbar-link ${isActive ? 'active' : ''}`} onClick={closeMenu}>
            <Truck size={18} color="#10b981" /> Mi Ruta
          </NavLink>
        ) : (
          <>
            <TopbarDropdown title="Ventas" icon={Briefcase} currentPath={location.pathname} activePaths={['/caja', '/ventas', '/preventa', '/cotizaciones', '/clientes', '/taller']} isOpen={openGroup === 'Ventas'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'caja') && <NavLink to="/caja" className="topbar-dropdown-item" onClick={closeMenu}><Monitor size={18} /> Turnos de Caja</NavLink>}
              {isPageActive(tenantInfo, 'ventas') && <NavLink to="/ventas" className="topbar-dropdown-item" onClick={closeMenu}><ShoppingCart size={18} /> Ventas (POS)</NavLink>}
              {isPageActive(tenantInfo, 'preventa') && role !== 'CAJERO' && <NavLink to="/preventa" className="topbar-dropdown-item" onClick={closeMenu}><ShoppingCart size={18} color="#10b981" /> Preventa Móvil</NavLink>}
              {isPageActive(tenantInfo, 'cotizaciones') && <NavLink to="/cotizaciones" className="topbar-dropdown-item" onClick={closeMenu}><FileSignature size={18} /> Cotizaciones</NavLink>}
              {isPageActive(tenantInfo, 'cotizaciones') && <NavLink to="/pedidos-preventa" className="topbar-dropdown-item" onClick={closeMenu}><ShoppingCart size={18} /> Pedidos Preventa</NavLink>}
              {isPageActive(tenantInfo, 'taller') && <NavLink to="/taller" className="topbar-dropdown-item" onClick={closeMenu}><Wrench size={18} /> Taller / Servicio Técnico</NavLink>}
              {isPageActive(tenantInfo, 'clientes') && <NavLink to="/clientes" className="topbar-dropdown-item" onClick={closeMenu}><Contact size={18} /> Clientes</NavLink>}
            </TopbarDropdown>

            <TopbarDropdown title="Tienda" icon={Store} currentPath={location.pathname} activePaths={['/pedidos-web']} isOpen={openGroup === 'Tienda'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'pedidos_web') && (
                <NavLink to="/pedidos-web" className="topbar-dropdown-item" onClick={closeMenu} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShoppingBag size={18} color={pendingWebOrders > 0 ? '#3b82f6' : 'currentColor'} /> Pedidos Web
                  </div>
                  {pendingWebOrders > 0 && <span style={{ background: '#ef4444', color: 'white', fontSize: '11px', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold' }}>{pendingWebOrders}</span>}
                </NavLink>
              )}
              {isPageActive(tenantInfo, 'tienda_virtual') && <a href={`/tienda/${tenantInfo?.id}`} target="_blank" rel="noopener noreferrer" className="topbar-dropdown-item"><ShoppingCart size={18} /> Tienda Virtual</a>}
            </TopbarDropdown>

            <TopbarDropdown title="Compras" icon={ShoppingBag} currentPath={location.pathname} activePaths={['/compras', '/proveedores']} isOpen={openGroup === 'Compras'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'compras') && <NavLink to="/compras" className="topbar-dropdown-item" onClick={closeMenu}><ShoppingBag size={18} /> Compras</NavLink>}
              {isPageActive(tenantInfo, 'proveedores') && <NavLink to="/proveedores" className="topbar-dropdown-item" onClick={closeMenu}><Truck size={18} /> Proveedores</NavLink>}
            </TopbarDropdown>

            <TopbarDropdown title="Inventario" icon={Layers} currentPath={location.pathname} activePaths={['/catalogo', '/inventario', '/kardex', '/traslados']} isOpen={openGroup === 'Inventario'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'catalogo') && <NavLink to="/catalogo" className="topbar-dropdown-item" onClick={closeMenu}><Package size={18} /> Catálogo</NavLink>}
              {isPageActive(tenantInfo, 'existencias') && <NavLink to="/inventario" className="topbar-dropdown-item" onClick={closeMenu}><Package size={18} /> Existencias</NavLink>}
              {isPageActive(tenantInfo, 'kardex') && <NavLink to="/kardex" className="topbar-dropdown-item" onClick={closeMenu}><ClipboardList size={18} /> Historial (Kardex)</NavLink>}
              {isPageActive(tenantInfo, 'traslados') && <NavLink to="/traslados" className="topbar-dropdown-item" onClick={closeMenu}><ArrowRightLeft size={18} /> Traslados</NavLink>}
            </TopbarDropdown>

            <TopbarDropdown title="Logística" icon={Truck} currentPath={location.pathname} activePaths={['/asignacion-rutas', '/bodega/revision-cargas', '/despachos', '/logistica/repartidores', '/mapa-logistica']} isOpen={openGroup === 'Logística'} onToggle={handleToggleGroup}>
              {role !== 'REPARTIDOR' && <NavLink to="/mapa-logistica" className="topbar-dropdown-item" onClick={closeMenu}><Map size={18} /> Mapa de Logística</NavLink>}
              {isPageActive(tenantInfo, 'asignacion_rutas') && <NavLink to="/asignacion-rutas" className="topbar-dropdown-item" onClick={closeMenu}><Truck size={18} /> Asignación de Rutas</NavLink>}
              {isPageActive(tenantInfo, 'revision_cargas') && <NavLink to="/bodega/revision-cargas" className="topbar-dropdown-item" onClick={closeMenu}><Package size={18} /> Revisión de Cargas</NavLink>}
              {isPageActive(tenantInfo, 'despachos') && <NavLink to="/despachos" className="topbar-dropdown-item" onClick={closeMenu}><Truck size={18} /> Entregas en Ruta</NavLink>}
              <NavLink to="/mi-ruta" className="topbar-dropdown-item" onClick={closeMenu}><Truck size={18} /> Mi Ruta Móvil</NavLink>
              {isPageActive(tenantInfo, 'repartidores') && <NavLink to="/repartidores" className="topbar-dropdown-item" onClick={closeMenu}><Users size={18} /> Repartidores / Vehículos</NavLink>}
            </TopbarDropdown>

            <TopbarDropdown title="RRHH" icon={Users} currentPath={location.pathname} activePaths={['/rrhh/departamentos', '/rrhh/cargos', '/rrhh/empleados', '/rrhh/asistencia', '/rrhh/vacaciones', '/rrhh/planilla', '/rrhh/reportes']} isOpen={openGroup === 'RRHH'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'departamentos') && <NavLink to="/rrhh/departamentos" className="topbar-dropdown-item" onClick={closeMenu}><Briefcase size={18} /> Departamentos</NavLink>}
              {isPageActive(tenantInfo, 'cargos') && <NavLink to="/rrhh/cargos" className="topbar-dropdown-item" onClick={closeMenu}><Contact size={18} /> Cargos (Roles)</NavLink>}
              {isPageActive(tenantInfo, 'empleados') && <NavLink to="/rrhh/empleados" className="topbar-dropdown-item" onClick={closeMenu}><Users size={18} /> Directorio RRHH</NavLink>}
              {isPageActive(tenantInfo, 'asistencia_hr') && <NavLink to="/rrhh/asistencia" className="topbar-dropdown-item" onClick={closeMenu}><Clock size={18} /> Control de Asistencia</NavLink>}
              {isPageActive(tenantInfo, 'kiosko_asistencia') && <a href={`/kiosko/${tenantInfo?.id}`} target="_blank" rel="noopener noreferrer" className="topbar-dropdown-item"><MonitorDot size={18} /> Kiosko Asistencia</a>}
              {isPageActive(tenantInfo, 'vacaciones') && <NavLink to="/rrhh/vacaciones" className="topbar-dropdown-item" onClick={closeMenu}><Calendar size={18} /> Vacaciones</NavLink>}
              {isPageActive(tenantInfo, 'planilla') && <NavLink to="/rrhh/planilla" className="topbar-dropdown-item" onClick={closeMenu}><FileText size={18} /> Planilla / Nómina</NavLink>}
              {isPageActive(tenantInfo, 'reportes_hr') && <NavLink to="/rrhh/reportes" className="topbar-dropdown-item" onClick={closeMenu}><PieChart size={18} /> Reportes Ley</NavLink>}
            </TopbarDropdown>
            
            <TopbarDropdown title="Finanzas" icon={DollarSign} currentPath={location.pathname} activePaths={['/cartera/cxc', '/cartera/cxp']} isOpen={openGroup === 'Finanzas'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'cxc') && <NavLink to="/cartera/cxc" className="topbar-dropdown-item" onClick={closeMenu}><UserCheck size={18} /> Cuentas por Cobrar</NavLink>}
              {isPageActive(tenantInfo, 'cxp') && <NavLink to="/cartera/cxp" className="topbar-dropdown-item" onClick={closeMenu}><Truck size={18} /> Cuentas por Pagar</NavLink>}
            </TopbarDropdown>

            <TopbarDropdown title="Contabilidad" icon={Calculator} currentPath={location.pathname} activePaths={['/contabilidad/catalogo', '/contabilidad/partidas', '/contabilidad/estados-financieros', '/contabilidad/libros-iva', '/firmador']} isOpen={openGroup === 'Contabilidad'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'firmador') && <NavLink to="/firmador" className="topbar-dropdown-item" onClick={closeMenu}><FileText size={18} /> Firmador DTE</NavLink>}
              {isPageActive(tenantInfo, 'catalogo_cuentas') && <NavLink to="/contabilidad/catalogo" className="topbar-dropdown-item" onClick={closeMenu}><BookOpen size={18} /> Catálogo Cuentas</NavLink>}
              {isPageActive(tenantInfo, 'libro_diario') && <NavLink to="/contabilidad/partidas" className="topbar-dropdown-item" onClick={closeMenu}><FileText size={18} /> Libro Diario</NavLink>}
              {isPageActive(tenantInfo, 'estados_financieros') && <NavLink to="/contabilidad/estados-financieros" className="topbar-dropdown-item" onClick={closeMenu}><BarChart2 size={18} /> Est. Financieros</NavLink>}
              {isPageActive(tenantInfo, 'libros_iva') && <NavLink to="/contabilidad/libros-iva" className="topbar-dropdown-item" onClick={closeMenu}><BookOpen size={18} /> Libros de IVA</NavLink>}
            </TopbarDropdown>

            <TopbarDropdown title="Auditoría" icon={ShieldCheck} currentPath={location.pathname} activePaths={['/historial', '/checkin']} isOpen={openGroup === 'Auditoría'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'historial') && <NavLink to="/historial" className="topbar-dropdown-item" onClick={closeMenu}><ArrowRightLeft size={18} /> Historial Global</NavLink>}
              {isPageActive(tenantInfo, 'checkin') && <NavLink to="/checkin" className="topbar-dropdown-item" onClick={closeMenu}><UserCheck size={18} /> Control de Acceso</NavLink>}
            </TopbarDropdown>

            <TopbarDropdown title="Reportes" icon={BarChart2} currentPath={location.pathname} activePaths={['/reportes']} isOpen={openGroup === 'Reportes'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'reportes') && (
                <>
                  <NavLink to="/reportes?tab=gerencial" className={() => getTabClass('/reportes', 'gerencial', 'gerencial')} onClick={closeMenu}><LayoutDashboard size={18} /> Dash. Gerencial</NavLink>
                  <NavLink to="/reportes?tab=comercial" className={() => getTabClass('/reportes', 'comercial', 'gerencial')} onClick={closeMenu}><ShoppingCart size={18} /> Dash. Comercial</NavLink>
                  <NavLink to="/reportes?tab=financiero" className={() => getTabClass('/reportes', 'financiero', 'gerencial')} onClick={closeMenu}><PieChart size={18} /> Dash. Financiero</NavLink>
                  <NavLink to="/reportes?tab=inventario" className={() => getTabClass('/reportes', 'inventario', 'gerencial')} onClick={closeMenu}><Package size={18} /> Dash. Inventario</NavLink>
                  <NavLink to="/reportes?tab=abastecimiento" className={() => getTabClass('/reportes', 'abastecimiento', 'gerencial')} onClick={closeMenu}><Truck size={18} /> Dash. Abastecimiento</NavLink>
                  <NavLink to="/reportes?tab=rrhh" className={() => getTabClass('/reportes', 'rrhh', 'gerencial')} onClick={closeMenu}><Users size={18} /> Dash. RRHH</NavLink>
                </>
              )}
            </TopbarDropdown>

            <TopbarDropdown title="Ajustes" icon={Settings} currentPath={location.pathname} activePaths={['/configuracion', '/configuracion/usuarios']} isOpen={openGroup === 'Ajustes'} onToggle={handleToggleGroup}>
              {isPageActive(tenantInfo, 'configuracion') && (
                <>
                  <NavLink to="/configuracion?tab=general" className={() => getTabClass('/configuracion', 'general', 'general')} onClick={closeMenu}><Building2 size={18} /> General</NavLink>
                  <NavLink to="/configuracion?tab=facturacion" className={() => getTabClass('/configuracion', 'facturacion', 'general')} onClick={closeMenu}><Receipt size={18} /> Facturación & DTE</NavLink>
                  <NavLink to="/configuracion?tab=sistema" className={() => getTabClass('/configuracion', 'sistema', 'general')} onClick={closeMenu}><Settings size={18} /> Sistema ERP</NavLink>
                  <NavLink to="/configuracion?tab=tienda" className={() => getTabClass('/configuracion', 'tienda', 'general')} onClick={closeMenu}><Store size={18} /> Tienda Virtual</NavLink>
                  <NavLink to="/configuracion/usuarios" className={() => getTabClass('/configuracion/usuarios', '', '')} onClick={closeMenu}><UserCheck size={18} /> Usuarios del Sistema</NavLink>
                </>
              )}
            </TopbarDropdown>
          </>
        )}
      </div>

        {/* Profile & Logout */}
        <div className="topbar-profile">
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>{userName}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{role}</span>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
            {userName ? userName.charAt(0).toUpperCase() : <UserCheck size={20} />}
          </div>
          <button 
            onClick={onLogout}
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '8px' }}
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Topbar;
