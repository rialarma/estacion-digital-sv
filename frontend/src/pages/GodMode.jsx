import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  ShieldAlert, Unlock, Save, Settings, Users, Store, Layers, BookOpen, 
  Truck, Contact, Briefcase, Monitor, DollarSign, Calculator, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Configura aquí tu correo de Super Admin
const SUPERADMIN_EMAILS = ['raam2508@gmail.com'];

const SYSTEM_MODULES = [
  {
    id: 'operaciones',
    name: 'Operaciones',
    icon: Briefcase,
    dbFlag: null, // Siempre activo a nivel de módulo, se apagan las páginas
    pages: [
      { id: 'caja', name: 'Turnos de Caja' },
      { id: 'cotizaciones', name: 'Docs. Pendientes' },
      { id: 'ventas', name: 'Ventas (POS)' },
      { id: 'preventa', name: 'Preventa Móvil' },
      { id: 'pedidos_web', name: 'Pedidos Web' },
      { id: 'compras', name: 'Compras' },
      { id: 'historial', name: 'Historial Global' },
      { id: 'clientes', name: 'Clientes' },
      { id: 'proveedores', name: 'Proveedores' }
    ]
  },
  {
    id: 'inventario',
    name: 'Inventario',
    icon: Layers,
    dbFlag: 'module_inventory',
    pages: [
      { id: 'catalogo', name: 'Catálogo' },
      { id: 'existencias', name: 'Existencias' },
      { id: 'kardex', name: 'Historial (Kardex)' },
      { id: 'traslados', name: 'Traslados' }
    ]
  },
  {
    id: 'logistica',
    name: 'Logística',
    icon: Truck,
    dbFlag: 'module_logistics',
    pages: [
      { id: 'asignacion_rutas', name: 'Asignación de Rutas' },
      { id: 'revision_cargas', name: 'Revisión de Cargas' },
      { id: 'despachos', name: 'Entregas en Ruta' }
    ]
  },
  {
    id: 'finanzas',
    name: 'Finanzas',
    icon: DollarSign,
    dbFlag: null, // Siempre activo a nivel de módulo
    pages: [
      { id: 'cxc', name: 'Cuentas por Cobrar' },
      { id: 'cxp', name: 'Cuentas por Pagar' }
    ]
  },
  {
    id: 'rrhh',
    name: 'Recursos Humanos',
    icon: Users,
    dbFlag: 'module_hr',
    pages: [
      { id: 'departamentos', name: 'Departamentos' },
      { id: 'cargos', name: 'Cargos (Roles)' },
      { id: 'empleados', name: 'Directorio RRHH' },
      { id: 'asistencia_hr', name: 'Control de Asistencia' },
      { id: 'vacaciones', name: 'Vacaciones' },
      { id: 'planilla', name: 'Planilla / Nómina' },
      { id: 'reportes_hr', name: 'Reportes Ley' }
    ]
  },
  {
    id: 'contabilidad',
    name: 'Contabilidad',
    icon: Calculator,
    dbFlag: 'module_accounting',
    pages: [
      { id: 'firmador', name: 'Firmador DTE' },
      { id: 'catalogo_cuentas', name: 'Catálogo Cuentas' },
      { id: 'libro_diario', name: 'Libro Diario' },
      { id: 'estados_financieros', name: 'Est. Financieros' },
      { id: 'libros_iva', name: 'Libros de IVA' }
    ]
  },
  {
    id: 'enlaces',
    name: 'Enlaces Públicos',
    icon: Monitor,
    dbFlag: null,
    pages: [
      { id: 'tienda_virtual', name: 'Tienda Virtual' },
      { id: 'kiosko_asistencia', name: 'Kiosko Asistencia' }
    ]
  },
  {
    id: 'admin',
    name: 'Administración',
    icon: Settings,
    dbFlag: null,
    pages: [
      { id: 'reportes', name: 'Reportes' },
      { id: 'configuracion', name: 'Configuración' }
    ]
  },
  {
    id: 'membresias',
    name: 'Membresías',
    icon: Contact,
    dbFlag: 'module_memberships',
    pages: [
      { id: 'checkin', name: 'Control de Acceso' }
    ]
  }
];

const GodMode = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/');
        return;
      }

      if (SUPERADMIN_EMAILS.includes(user.email)) {
        setIsAuthorized(true);
        fetchTenants();
      } else {
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error(err);
      setIsAuthorized(false);
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Ensure active_pages exists
      const processedData = data.map(t => ({
        ...t,
        active_pages: t.active_pages || {}
      }));
      
      setTenants(processedData);
    } catch (err) {
      console.error(err);
      alert('Error cargando tenants: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMainModule = async (tenantId, dbFlag, currentValue) => {
    if (!dbFlag) return;
    try {
      const newValue = currentValue === false ? true : false;
      const { error } = await supabase
        .from('tenants')
        .update({ [dbFlag]: newValue })
        .eq('id', tenantId);
        
      if (error) throw error;
      
      setTenants(tenants.map(t => 
        t.id === tenantId ? { ...t, [dbFlag]: newValue } : t
      ));
    } catch (err) {
      console.error(err);
      alert('Error actualizando módulo: ' + err.message);
    }
  };

  const handleToggleAllPages = async (tenantId, pages, currentValue) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      const activePages = { ...tenant.active_pages };
      
      const newValue = currentValue === false ? true : false;
      
      pages.forEach(page => {
        activePages[page.id] = newValue;
      });

      const { error } = await supabase
        .from('tenants')
        .update({ active_pages: activePages })
        .eq('id', tenantId);
        
      if (error) throw error;
      
      setTenants(tenants.map(t => 
        t.id === tenantId ? { ...t, active_pages: activePages } : t
      ));
    } catch (err) {
      console.error(err);
      alert('Error actualizando páginas: ' + err.message);
    }
  };

  const handleTogglePage = async (tenantId, pageId, currentValue) => {
    try {
      const tenant = tenants.find(t => t.id === tenantId);
      const activePages = { ...tenant.active_pages };
      
      // Si el valor actual es true (o undefined, que asume true), lo ponemos a false.
      activePages[pageId] = currentValue === false ? true : false;

      const { error } = await supabase
        .from('tenants')
        .update({ active_pages: activePages })
        .eq('id', tenantId);
        
      if (error) throw error;
      
      setTenants(tenants.map(t => 
        t.id === tenantId ? { ...t, active_pages: activePages } : t
      ));
    } catch (err) {
      console.error(err);
      alert('Error actualizando página: ' + err.message);
    }
  };

  if (authChecking) {
    return <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-app)' }}>Verificando credenciales...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-app)' }}>
        <div className="glass-panel" style={{ padding: '40px', width: '400px', textAlign: 'center' }}>
          <ShieldAlert size={64} style={{ color: '#ef4444', marginBottom: '20px' }} />
          <h2 style={{ marginBottom: '10px' }}>Acceso Denegado</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>No tienes permisos de Super Administrador para ver esta página.</p>
          <button onClick={() => navigate('/')} className="glass-button" style={{ justifyContent: 'center' }}>
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '40px' }}>
      <div className="page-header" style={{ marginBottom: '30px', borderBottom: '1px solid rgba(239, 68, 68, 0.3)', paddingBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }}>
            <ShieldAlert size={32} /> God Mode - Panel de Control Súper Admin
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Gestiona los módulos y páginas individuales de cada inquilino de forma granular.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando empresas...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {tenants.map(tenant => (
            <div key={tenant.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Tenant Header */}
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
              >
                <div>
                  <h2 style={{ fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Store size={24} color="var(--primary)" /> {tenant.name}
                  </h2>
                  <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                    <span>ID: {tenant.id.split('-')[0]}...</span>
                    {tenant.nit && <span>NIT: {tenant.nit}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                    Plan: {tenant.subscription_plan || 'BASIC'}
                  </div>
                  {expandedTenant === tenant.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {/* Granular Module Configuration */}
              {expandedTenant === tenant.id && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  {SYSTEM_MODULES.map(module => (
                    <div key={module.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px' }}>
                      
                      {/* Module Main Toggle */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: module.pages.length > 0 ? '16px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <module.icon size={20} color="var(--primary)" />
                          <h3 style={{ fontSize: '16px', margin: 0 }}>{module.name}</h3>
                        </div>
                        
                        {(module.dbFlag || module.pages.length > 0) && (
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
                            <span>Módulo Completo</span>
                            <input 
                              type="checkbox" 
                              checked={module.dbFlag ? tenant[module.dbFlag] !== false : module.pages.every(p => tenant.active_pages[p.id] !== false)} 
                              onChange={() => {
                                if (module.dbFlag) {
                                  handleToggleMainModule(tenant.id, module.dbFlag, tenant[module.dbFlag] !== false);
                                } else {
                                  handleToggleAllPages(tenant.id, module.pages, module.pages.every(p => tenant.active_pages[p.id] !== false));
                                }
                              }}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }}
                            />
                          </label>
                        )}
                      </div>

                      {/* Pages Sub-toggles */}
                      {module.pages.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', paddingLeft: '30px' }}>
                          {module.pages.map(page => {
                            // Por defecto es true, a menos que esté explícitamente en false
                            const isActive = tenant.active_pages[page.id] !== false;
                            
                            // Si el módulo principal está apagado, forzar deshabilitado visualmente (opcional)
                            const isModuleDisabled = module.dbFlag && tenant[module.dbFlag] === false;

                            return (
                              <div key={page.id} style={{ background: 'var(--bg-app)', padding: '12px 16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isModuleDisabled ? 0.5 : 1 }}>
                                <span style={{ fontSize: '14px' }}>{page.name}</span>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: isModuleDisabled ? 'not-allowed' : 'pointer' }}>
                                  <input 
                                    type="checkbox" 
                                    checked={isActive && !isModuleDisabled} 
                                    disabled={isModuleDisabled}
                                    onChange={() => handleTogglePage(tenant.id, page.id, isActive)}
                                    style={{ width: '16px', height: '16px', cursor: isModuleDisabled ? 'not-allowed' : 'pointer', accentColor: '#10b981' }}
                                  />
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {tenants.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--glass-bg)', borderRadius: '12px' }}>
              No hay empresas registradas en el sistema.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GodMode;
