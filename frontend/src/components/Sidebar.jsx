import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, ShoppingCart, FileText, Package, Users, UserCheck, 
  Settings, MonitorDot, LogOut, Store, Truck, ClipboardList, 
  BarChart2, X, BookOpen, ChevronDown, ChevronRight, Briefcase, 
  Layers, Contact, Calculator, ShieldCheck, DollarSign, Monitor, FileSignature, ArrowRightLeft, Home
} from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

const SidebarGroup = ({ title, icon: Icon, children, currentPath, activePaths }) => {
  // Auto-expand if the current path is inside this group
  const isActiveGroup = activePaths.some(p => currentPath.includes(p));
  const [isOpen, setIsOpen] = useState(isActiveGroup);
  
  // Update state if location changes and enters this group
  useEffect(() => {
    if (isActiveGroup && !isOpen) {
      setIsOpen(true);
    }
  }, [isActiveGroup]);

  return (
    <div style={{ marginBottom: '4px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
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
          {children}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ onLogout, isOpen, onClose }) => {
  const { tenantInfo } = useTenantStore();
  const location = useLocation();

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <button className="mobile-close-btn" onClick={onClose}>
        <X size={24} />
      </button>
      
      {/* Branding */}
      <div className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '18px', fontWeight: 'bold', color: '#fff', width: '100%' }}>
          <Store size={24} style={{ color: 'var(--primary)' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tenantInfo?.name || 'Mi Empresa'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', paddingLeft: '34px' }}>
          <MonitorDot size={12} /> Estación Digital SV
        </div>
      </div>
      
      {/* Links Container */}
      <div className="sidebar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} style={{ marginBottom: '16px' }} onClick={onClose} end>
          <Home size={18} /> Inicio
        </NavLink>

        <SidebarGroup 
          title="Operaciones" 
          icon={Briefcase} 
          currentPath={location.pathname} 
          activePaths={['/caja', '/ventas', '/compras', '/historial', '/cotizaciones', '/firmador']}
        >
          <NavLink to="/caja" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Monitor size={18} /> Turnos de Caja
          </NavLink>
          <NavLink to="/cotizaciones" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <FileSignature size={18} /> Cotizaciones
          </NavLink>
          <NavLink to="/ventas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ShoppingCart size={18} /> Ventas (POS)
          </NavLink>
          <NavLink to="/compras" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ShoppingBag size={18} /> Compras
          </NavLink>
          <NavLink to="/historial" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ArrowRightLeft size={18} /> Historial Global
          </NavLink>
          <NavLink to="/firmador" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <FileText size={18} /> Firmador DTE
          </NavLink>
        </SidebarGroup>

        <SidebarGroup 
          title="Inventario" 
          icon={Layers} 
          currentPath={location.pathname} 
          activePaths={['/catalogo', '/inventario', '/kardex', '/traslados']}
        >
          <NavLink to="/catalogo" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Package size={18} /> Catálogo
          </NavLink>
          <NavLink to="/inventario" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Package size={18} /> Existencias
          </NavLink>
          <NavLink to="/kardex" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ClipboardList size={18} /> Historial (Kardex)
          </NavLink>
          <NavLink to="/traslados" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <ArrowRightLeft size={18} /> Traslados
          </NavLink>
        </SidebarGroup>

        <SidebarGroup 
          title="Logística" 
          icon={Truck} 
          currentPath={location.pathname} 
          activePaths={['/bodega/revision-cargas', '/despachos']}
        >
          <NavLink to="/bodega/revision-cargas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Package size={18} /> Revisión de Cargas
          </NavLink>
          <NavLink to="/despachos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Truck size={18} /> Entregas en Ruta
          </NavLink>
        </SidebarGroup>

        <SidebarGroup 
          title="Contactos" 
          icon={Contact} 
          currentPath={location.pathname} 
          activePaths={['/clientes', '/proveedores', '/vendedores']}
        >
          <NavLink to="/clientes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Users size={18} /> Clientes
          </NavLink>
          <NavLink to="/proveedores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Truck size={18} /> Proveedores
          </NavLink>
          <NavLink to="/vendedores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <UserCheck size={18} /> Vendedores
          </NavLink>
          <NavLink to="/repartidores" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Truck size={18} /> Repartidores
          </NavLink>
        </SidebarGroup>

        <SidebarGroup 
          title="Cartera" 
          icon={DollarSign} 
          currentPath={location.pathname} 
          activePaths={['/cartera/cxc', '/cartera/cxp']}
        >
          <NavLink to="/cartera/cxc" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <UserCheck size={18} /> Cuentas por Cobrar
          </NavLink>
          <NavLink to="/cartera/cxp" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Truck size={18} /> Cuentas por Pagar
          </NavLink>
        </SidebarGroup>

        <SidebarGroup 
          title="Contabilidad" 
          icon={Calculator} 
          currentPath={location.pathname} 
          activePaths={['/contabilidad/catalogo', '/contabilidad/partidas', '/contabilidad/estados-financieros', '/contabilidad/libros-iva']}
        >
          <NavLink to="/contabilidad/catalogo" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <BookOpen size={18} /> Catálogo Cuentas
          </NavLink>
          <NavLink to="/contabilidad/partidas" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <FileText size={18} /> Libro Diario
          </NavLink>
          <NavLink to="/contabilidad/estados-financieros" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <BarChart2 size={18} /> Est. Financieros
          </NavLink>
          <NavLink to="/contabilidad/libros-iva" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <BookOpen size={18} /> Libros de IVA
          </NavLink>
        </SidebarGroup>

        <SidebarGroup 
          title="Sistema" 
          icon={ShieldCheck} 
          currentPath={location.pathname} 
          activePaths={['/reportes', '/configuracion']}
        >
          <NavLink to="/reportes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <BarChart2 size={18} /> Reportes
          </NavLink>
          <NavLink to="/configuracion" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
            <Settings size={18} /> Configuración
          </NavLink>
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
