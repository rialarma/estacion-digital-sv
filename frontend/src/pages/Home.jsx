import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useTenantStore } from '../store/useTenantStore';
import { Link } from 'react-router-dom';
import { 
  ShoppingCart, Monitor, FileSignature, 
  Package, Layers, ClipboardList, ArrowRightLeft,
  Briefcase, DollarSign, Settings, Clock, LogIn, LogOut,
  TrendingUp, AlertCircle, Users
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';

const Home = () => {
  const { user } = useAuth();
  const { tenantInfo } = useTenantStore();
  const [profile, setProfile] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dashboard Metrics
  const [salesData, setSalesData] = useState([]);
  const [kpis, setKpis] = useState({ todaySales: 0, cxcTotal: 0, totalProducts: 0 });
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    const fetchProfileAndShift = async () => {
      if (!user) return;
        // Fetch Profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, role, branch_id')
          .eq('id', user.id)
          .single();
        setProfile(profileData);

        // Fetch active attendance shift
        const { data: shiftData } = await supabase
          .from('employee_attendance')
          .select('*')
          .eq('user_id', user.id)
          .is('clock_out', null)
          .order('clock_in', { ascending: false })
          .limit(1)
          .single();
        setActiveShift(shiftData || null);

        // Fetch Dashboard Data if Admin or Gerente
        if (profileData && ['ADMIN', 'GERENTE'].includes(profileData.role)) {
          await fetchDashboardData(profileData.branch_id);
        }

      setLoading(false);
    };
    fetchProfileAndShift();
  }, [user]);

  const fetchDashboardData = async (branch_id) => {
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      // 1. Sales today
      const { data: todaySales } = await supabase
        .from('sales')
        .select('total')
        .eq('branch_id', branch_id)
        .gte('created_at', today.toISOString());
      
      const totalToday = todaySales ? todaySales.reduce((sum, s) => sum + Number(s.total), 0) : 0;

      // 2. CXC Total
      const { data: cxcAccounts } = await supabase
        .from('accounts_receivable')
        .select('balance')
        .eq('tenant_id', tenantInfo?.id);
      
      const totalCxc = cxcAccounts ? cxcAccounts.reduce((sum, a) => sum + Number(a.balance), 0) : 0;

      // 3. Low Stock
      const { data: lowStockProducts } = await supabase
        .from('products')
        .select('name, stock, minimum_stock')
        .eq('branch_id', branch_id)
        .order('stock', { ascending: true })
        .limit(5);
        
      setLowStock(lowStockProducts?.filter(p => p.stock <= (p.minimum_stock || 5)) || []);

      setKpis({
        todaySales: totalToday,
        cxcTotal: totalCxc,
        totalProducts: 0 // Mock, could fetch count
      });

      // 4. Sales Chart (Last 7 days mock or real)
      const { data: weeklySales } = await supabase
        .from('sales')
        .select('total, created_at')
        .eq('branch_id', branch_id)
        .gte('created_at', lastWeek.toISOString())
        .order('created_at', { ascending: true });

      const grouped = {};
      if (weeklySales) {
        weeklySales.forEach(sale => {
          const d = new Date(sale.created_at).toLocaleDateString('es-ES', { weekday: 'short' });
          grouped[d] = (grouped[d] || 0) + Number(sale.total);
        });
      }
      
      const chartData = Object.keys(grouped).map(k => ({
        name: k,
        ventas: grouped[k]
      }));
      
      // Fill missing days
      if (chartData.length === 0) {
        chartData.push({ name: 'Sin datos', ventas: 0 });
      }

      setSalesData(chartData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleClockIn = async () => {
    setActionLoading(true);
    const { data, error } = await supabase
      .from('employee_attendance')
      .insert([
        { 
          tenant_id: tenantInfo.id,
          user_id: user.id
        }
      ])
      .select()
      .single();
      
    if (!error && data) setActiveShift(data);
    setActionLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeShift) return;
    setActionLoading(true);
    
    const { error } = await supabase
      .from('employee_attendance')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', activeShift.id);
      
    if (!error) setActiveShift(null);
    setActionLoading(false);
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando inicio...</div>;
  }

  const isPageActive = (pageId) => tenantInfo?.active_pages?.[pageId] !== false;

  const getQuickActions = (role) => {
    const actions = [];
    if (['CAJERO', 'GERENTE', 'ADMIN'].includes(role)) {
      if (isPageActive('caja')) actions.push({ title: 'Abrir / Cerrar Caja', desc: 'Gestiona tu turno de efectivo', icon: <Monitor size={32} color="#3b82f6" />, link: '/caja', color: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' });
      if (isPageActive('ventas')) actions.push({ title: 'Punto de Venta (POS)', desc: 'Facturar e imprimir tickets', icon: <ShoppingCart size={32} color="#10b981" />, link: '/ventas', color: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.3)' });
      if (isPageActive('cotizaciones')) actions.push({ title: 'Docs. Pendientes', desc: 'Proformas y Preventas', icon: <FileSignature size={32} color="#eab308" />, link: '/cotizaciones', color: 'rgba(234, 179, 8, 0.1)', borderColor: 'rgba(234, 179, 8, 0.3)' });
    }
    if (['BODEGUERO', 'GERENTE', 'ADMIN'].includes(role)) {
      if (isPageActive('existencias')) actions.push({ title: 'Existencias', desc: 'Ver stock actual', icon: <Layers size={32} color="#f59e0b" />, link: '/inventario', color: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' });
      if (isPageActive('kardex')) actions.push({ title: 'Kardex', desc: 'Historial de movimientos', icon: <ClipboardList size={32} color="#8b5cf6" />, link: '/kardex', color: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.3)' });
      if (isPageActive('traslados')) actions.push({ title: 'Traslados', desc: 'Mover mercancía entre sucursales', icon: <ArrowRightLeft size={32} color="#ec4899" />, link: '/traslados', color: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)' });
    }
    if (['CONTADOR', 'GERENTE', 'ADMIN'].includes(role)) {
      if (isPageActive('cxc')) actions.push({ title: 'Cuentas por Cobrar', desc: 'Créditos otorgados a clientes', icon: <DollarSign size={32} color="#14b8a6" />, link: '/cartera/cxc', color: 'rgba(20, 184, 166, 0.1)', borderColor: 'rgba(20, 184, 166, 0.3)' });
      if (isPageActive('cxp')) actions.push({ title: 'Cuentas por Pagar', desc: 'Créditos con proveedores', icon: <Briefcase size={32} color="#ef4444" />, link: '/cartera/cxp', color: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' });
    }
    if (['ADMIN'].includes(role)) {
      if (isPageActive('configuracion')) actions.push({ title: 'Configuración', desc: 'Ajustes del sistema', icon: <Settings size={32} color="#94a3b8" />, link: '/configuracion', color: 'rgba(148, 163, 184, 0.1)', borderColor: 'rgba(148, 163, 184, 0.3)' });
    }
    return actions;
  };

  const actions = profile ? getQuickActions(profile.role) : [];
  const isAdminOrGerente = profile && ['ADMIN', 'GERENTE'].includes(profile.role);

  return (
    <div className="page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Saludo Principal */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>
            ¡Hola, <span style={{ color: 'var(--primary)' }}>{profile?.first_name || 'Usuario'}</span>! 👋
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)' }}>
            Bienvenido de vuelta a {tenantInfo?.company_name || 'tu sistema'}.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <div style={{ background: 'var(--bg-dark)', padding: '6px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            Rol: {profile?.role || 'No definido'}
          </div>
        </div>
      </div>

      {isAdminOrGerente && (
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px', marginLeft: '4px' }}>Dashboard Gerencial</h2>
          
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px' }}><TrendingUp size={32} color="#10b981" /></div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Ventas de Hoy</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${kpis.todaySales.toFixed(2)}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '16px', borderRadius: '16px' }}><DollarSign size={32} color="#3b82f6" /></div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Cuentas por Cobrar</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>${kpis.cxcTotal.toFixed(2)}</div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '16px' }}><AlertCircle size={32} color="#ef4444" /></div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>Alertas de Inventario</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: lowStock.length > 0 ? '#ef4444' : 'inherit' }}>{lowStock.length} items</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
            {/* Chart */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '24px', color: 'var(--text-muted)' }}>Tendencia de Ventas (Últimos 7 días)</h3>
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ color: '#3b82f6' }}
                    />
                    <Area type="monotone" dataKey="ventas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVentas)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Low Stock Widget */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} color="#ef4444" /> Inventario Bajo
              </h3>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {lowStock.length > 0 ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {lowStock.map((p, i) => (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '14px' }}>{p.name}</span>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>{p.stock}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
                    Todo en orden. No hay productos con bajo inventario.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control de Asistencia */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px', 
          marginBottom: '32px',
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          border: `1px solid ${activeShift ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
          background: activeShift ? 'rgba(16, 185, 129, 0.05)' : 'rgba(59, 130, 246, 0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontSize: '20px', fontWeight: 'bold' }}>
          <Clock size={24} style={{ color: activeShift ? '#10b981' : '#3b82f6' }} />
          Control de Asistencia
        </div>
        
        {activeShift ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', textAlign: 'center' }}>
              Iniciaste turno a las: <strong style={{ color: 'var(--text-main)' }}>{new Date(activeShift.clock_in).toLocaleTimeString()}</strong>
            </p>
            <button 
              className="btn btn-danger" 
              onClick={handleClockOut} 
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '16px' }}
            >
              <LogOut size={20} />
              {actionLoading ? 'Guardando...' : 'Marcar Salida'}
            </button>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', textAlign: 'center' }}>
              No has marcado entrada. ¡Que tengas un excelente turno!
            </p>
            <button 
              className="btn btn-primary" 
              onClick={handleClockIn} 
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '16px' }}
            >
              <LogIn size={20} />
              {actionLoading ? 'Guardando...' : 'Marcar Entrada'}
            </button>
          </>
        )}
      </div>

      {/* Acciones Rápidas */}
      <h2 style={{ fontSize: '20px', marginBottom: '20px', marginLeft: '4px' }}>Accesos Directos</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {actions.map((action, idx) => (
          <Link 
            key={idx} 
            to={action.link}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div 
              className="glass-panel" 
              style={{ 
                padding: '24px', 
                height: '100%',
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                background: action.color,
                border: `1px solid ${action.borderColor}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '12px' }}>
                {action.icon}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>{action.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{action.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
};

export default Home;
