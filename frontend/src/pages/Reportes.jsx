import React, { useState, Suspense, lazy } from 'react';
import { Calendar, LayoutDashboard, PieChart, ShoppingCart, Package, Users, Truck } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';

// Lazy load los dashboards para no sobrecargar el bundle inicial ni la RAM del cliente
const DashboardGerencial = lazy(() => import('./reportes/DashboardGerencial'));
const DashboardComercial = lazy(() => import('./reportes/DashboardComercial'));
const DashboardFinanciero = lazy(() => import('./reportes/DashboardFinanciero'));
const DashboardInventario = lazy(() => import('./reportes/DashboardInventario'));
const DashboardAbastecimiento = lazy(() => import('./reportes/DashboardAbastecimiento'));
const DashboardRRHH = lazy(() => import('./reportes/DashboardRRHH'));

const Reportes = () => {
  const { tenantId } = useTenantStore();
  const [period, setPeriod] = useState('30days'); // 'today', '7days', '30days', 'year'
  const [activeTab, setActiveTab] = useState('gerencial');

  // Calcular la fecha de inicio del filtro
  const getIsoStart = () => {
    const now = new Date();
    let startDate = new Date();
    if (period === 'today') {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === '7days') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === '30days') {
      startDate.setDate(now.getDate() - 30);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    }
    return startDate.toISOString();
  };

  const isoStart = getIsoStart();

  const tabs = [
    { id: 'gerencial', label: 'Gerencial', icon: LayoutDashboard },
    { id: 'comercial', label: 'Comercial', icon: ShoppingCart },
    { id: 'financiero', label: 'Financiero', icon: PieChart },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'abastecimiento', label: 'Abastecimiento', icon: Truck },
    { id: 'rrhh', label: 'RRHH', icon: Users },
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Cabecera y Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Dashboards Empresariales</h2>
          <p style={{ color: 'var(--text-muted)' }}>Métricas clave y rendimiento de tu negocio.</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--glass-bg)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <Calendar size={16} style={{ color: 'var(--primary)' }} />
          <select 
            className="glass-input" 
            style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '14px', width: 'auto', outline: 'none' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="today">Hoy</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="year">Último Año</option>
          </select>
        </div>
      </div>

      {/* Menú de Pestañas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido del Dashboard Seleccionado */}
      <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando módulo de inteligencia de negocios...</div>}>
        {activeTab === 'gerencial' && <DashboardGerencial tenantId={tenantId} isoStart={isoStart} />}
        {activeTab === 'comercial' && <DashboardComercial tenantId={tenantId} isoStart={isoStart} />}
        {activeTab === 'financiero' && <DashboardFinanciero tenantId={tenantId} isoStart={isoStart} />}
        {activeTab === 'inventario' && <DashboardInventario tenantId={tenantId} />}
        {activeTab === 'abastecimiento' && <DashboardAbastecimiento tenantId={tenantId} />}
        {activeTab === 'rrhh' && <DashboardRRHH tenantId={tenantId} isoStart={isoStart} />}
      </Suspense>

    </div>
  );
};

export default Reportes;
