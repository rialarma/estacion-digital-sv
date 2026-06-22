import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, FileText, Package, Users, UserCheck, Settings, MonitorDot, LogOut, Store, Truck, ClipboardList, BarChart2 } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

const Sidebar = ({ onLogout }) => {
  const { tenantInfo } = useTenantStore();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px', padding: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
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
      
      <div className="sidebar-links">
        <NavLink 
          to="/compras" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ShoppingBag size={20} />
          Compras
        </NavLink>

        <NavLink 
          to="/ventas" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ShoppingCart size={20} />
          Ventas (POS)
        </NavLink>
        
        <NavLink 
          to="/historial-ventas" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={20} />
          Historial de Ventas
        </NavLink>
        
        <NavLink 
          to="/firmador"  
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <FileText size={20} />
          Firmador
        </NavLink>

        <NavLink 
          to="/catalogo" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Package size={20} />
          Catálogo
        </NavLink>

        <NavLink 
          to="/inventario" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Package size={20} />
          Inventario
        </NavLink>

        <NavLink 
          to="/clientes" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          Clientes
        </NavLink>

        <NavLink 
          to="/proveedores" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Truck size={20} />
          Proveedores
        </NavLink>

        <NavLink 
          to="/vendedores" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <UserCheck size={20} />
          Vendedores
        </NavLink>

        <NavLink 
          to="/reportes" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <BarChart2 size={20} />
          Reportes
        </NavLink>

        <NavLink 
          to="/configuracion" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
        >
          <Settings size={20} />
          Configuración del Sistema
        </NavLink>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
        <button 
          onClick={onLogout}
          className="nav-link" 
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', color: '#f87171' }}
        >
          <LogOut size={20} />
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;
