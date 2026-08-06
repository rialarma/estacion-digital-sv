import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, LayoutDashboard, PieChart, ShoppingCart, Package, Users, Truck, BarChart2, FileText, Tag } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';
import PageHeader from '../components/PageHeader';

// Lazy load los dashboards para no sobrecargar el bundle inicial ni la RAM del cliente
const DashboardGerencial = lazy(() => import('./reportes/DashboardGerencial'));
const DashboardComercial = lazy(() => import('./reportes/DashboardComercial'));
const DashboardFinanciero = lazy(() => import('./reportes/DashboardFinanciero'));
const DashboardInventario = lazy(() => import('./reportes/DashboardInventario'));
const DashboardAbastecimiento = lazy(() => import('./reportes/DashboardAbastecimiento'));
const DashboardRRHH = lazy(() => import('./reportes/DashboardRRHH'));
const ReporteVentasDiarias = lazy(() => import('./reportes/ReporteVentasDiarias'));
const ReporteMejoresPrecios = lazy(() => import('./reportes/ReporteMejoresPrecios'));

const Reportes = () => {
  const { tenantId } = useTenantStore();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab') || 'gerencial';
  
  const [period, setPeriod] = useState('30days'); // 'today', '7days', '30days', 'year', 'custom'
  const [activeTab, setActiveTab] = useState(tabParam);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabClick = (id) => {
    setActiveTab(id);
    navigate(`/reportes?tab=${id}`);
  };

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
    } else if (period === 'custom' && customStart) {
      startDate = new Date(customStart + 'T00:00:00');
    }
    return startDate.toISOString();
  };

  const getIsoEnd = () => {
    const now = new Date();
    if (period === 'custom' && customEnd) {
      const endDate = new Date(customEnd + 'T23:59:59.999');
      return endDate.toISOString();
    }
    return now.toISOString();
  };

  const isoStart = getIsoStart();
  const isoEnd = getIsoEnd();

  const tabs = [
    { id: 'gerencial', label: 'Gerencial', icon: LayoutDashboard },
    { id: 'comercial', label: 'Comercial', icon: ShoppingCart },
    { id: 'financiero', label: 'Financiero', icon: PieChart },
    { id: 'inventario', label: 'Inventario', icon: Package },
    { id: 'abastecimiento', label: 'Abastecimiento', icon: Truck },
    { id: 'mejores-precios', label: 'Mejores Precios', icon: Tag },
    { id: 'rrhh', label: 'RRHH', icon: Users },
    { id: 'ventas-diarias', label: 'Dash. Ventas Diarias', icon: FileText },
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* Cabecera y Filtros */}
      <PageHeader title={`Dashboard ${tabs.find(t => t.id === activeTab)?.label || 'Empresarial'}`} icon={BarChart2}>
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
            <option value="custom">Personalizado</option>
          </select>
          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px', borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
              <input type="date" className="glass-input" style={{ padding: '4px 8px', fontSize: '13px' }} value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              <span style={{ color: 'var(--text-muted)' }}>al</span>
              <input type="date" className="glass-input" style={{ padding: '4px 8px', fontSize: '13px' }} value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          )}
        </div>
      </PageHeader>
      {/* Tabs Navigation Removed - Replaced by Topbar Dropdown */}

      {/* Contenido del Dashboard Seleccionado */}
      <Suspense fallback={<div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando módulo de inteligencia de negocios...</div>}>
        {activeTab === 'gerencial' && <DashboardGerencial tenantId={tenantId} isoStart={isoStart} isoEnd={isoEnd} />}
        {activeTab === 'comercial' && <DashboardComercial tenantId={tenantId} isoStart={isoStart} isoEnd={isoEnd} />}
        {activeTab === 'financiero' && <DashboardFinanciero tenantId={tenantId} isoStart={isoStart} isoEnd={isoEnd} />}
        {activeTab === 'inventario' && <DashboardInventario tenantId={tenantId} />}
        {activeTab === 'abastecimiento' && <DashboardAbastecimiento tenantId={tenantId} />}
        {activeTab === 'mejores-precios' && <ReporteMejoresPrecios tenantId={tenantId} />}
        {activeTab === 'rrhh' && <DashboardRRHH tenantId={tenantId} isoStart={isoStart} isoEnd={isoEnd} />}
        {activeTab === 'ventas-diarias' && <ReporteVentasDiarias tenantId={tenantId} isoStart={isoStart} isoEnd={isoEnd} />}
      </Suspense>

    </div>
  );
};

export default Reportes;
