import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { createClient } from '@supabase/supabase-js';
import { 
  ShieldAlert, Unlock, Save, Settings, Users, Store, Layers, BookOpen, 
  Truck, Contact, Briefcase, Monitor, DollarSign, Calculator, ChevronDown, ChevronUp,
  Plus, Copy, XCircle, Building2, Trash2, UserCheck, CreditCard, MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

// Cliente secundario para registrar al dueño sin desloguear al GodMode
const godmodeAuthClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
);

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
    dbFlag: null,
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
    dbFlag: null,
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
    dbFlag: null,
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
    dbFlag: null,
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
    dbFlag: null,
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
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTenant, setCreatingTenant] = useState(false);
  const [newTenantData, setNewTenantData] = useState({ 
    companyName: '', 
    companyNit: '', 
    branchName: 'Casa Matriz', 
    companyPrefix: '',
    adminFirstName: '',
    adminLastName: '',
    adminEmail: '',
    adminPassword: '',
    adminWhatsapp: ''
  });
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [botStatus, setBotStatus] = useState('CONNECTED');

  const navigate = useNavigate();

  useEffect(() => {
    checkAuthorization();

    const fetchBotStatus = async () => {
      const { data } = await supabase.from('bot_status').select('status').eq('id', 1).single();
      if (data) setBotStatus(data.status);
    };
    fetchBotStatus();

    const botSub = supabase.channel('bot-status-godmode')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bot_status', filter: 'id=eq.1' }, (payload) => {
        setBotStatus(payload.new.status);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(botSub);
    };
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

  const handleCreateTenant = async (e) => {
    e.preventDefault();
    setCreatingTenant(true);
    try {
      const prefix = newTenantData.companyPrefix.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!prefix) throw new Error('El prefijo de la empresa es obligatorio y no puede contener espacios.');
      if (!newTenantData.adminPassword || newTenantData.adminPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      if (!newTenantData.adminFirstName || !newTenantData.adminLastName) throw new Error('Nombre y Apellido son obligatorios.');

      const cleanFirstName = newTenantData.adminFirstName.trim().toLowerCase().replace(/[^a-z]/g, '');
      const cleanLastName = newTenantData.adminLastName.trim().toLowerCase().replace(/[^a-z]/g, '');
      const adminUsername = `${prefix}${cleanFirstName.substring(0,3)}${cleanLastName.substring(0,3)}`;
      const adminEmail = newTenantData.adminEmail ? newTenantData.adminEmail.trim().toLowerCase() : `admin@${prefix}.estaciondigital.sv`;

      // 1. Crear el usuario en auth.users usando el cliente secundario
      const { data: authData, error: authError } = await godmodeAuthClient.auth.signUp({
        email: adminEmail,
        password: newTenantData.adminPassword,
        options: {
          data: {
            first_name: newTenantData.adminFirstName,
            last_name: newTenantData.adminLastName,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Ese correo electrónico ya está registrado. Por favor, utiliza otro correo.');
        }
        throw authError;
      }

      if (!authData.user) throw new Error('No se pudo crear el usuario administrador.');

      // 2. Crear Tenant y asociar Perfil usando RPC con el cliente principal (Super Admin)
      const { data: rpcData, error: rpcError } = await supabase.rpc('godmode_create_tenant_and_admin', {
        p_company_name: newTenantData.companyName,
        p_company_nit: newTenantData.companyNit,
        p_prefix: prefix,
        p_admin_id: authData.user.id,
        p_admin_first_name: newTenantData.adminFirstName,
        p_admin_last_name: newTenantData.adminLastName,
        p_admin_username: adminUsername,
        p_whatsapp_number: newTenantData.adminWhatsapp
      });
      
      if (rpcError) throw rpcError;
      
      const welcomeMessage = `¡Hola! Tu sistema en Estación Digital SV está listo.\n\n🔗 Link de acceso: ${window.location.origin}\n👤 Usuario: ${adminUsername}\n🔑 Contraseña: ${newTenantData.adminPassword}\n\nPuedes cambiar tu contraseña dentro del sistema en la sección Configuración.`;

      // 3. Si hay número de WhatsApp, enviarlo al bot
      if (newTenantData.adminWhatsapp) {
        // Asumiendo que el RPC devuelve el ID del tenant creado (como dice en el SQL)
        // Usamos el godmode_send_whatsapp si existe en la BD
        await supabase.rpc('godmode_send_whatsapp', {
          p_tenant_id: rpcData.tenant_id,
          p_phone: newTenantData.adminWhatsapp,
          p_message: welcomeMessage
        });
      }

      setGeneratedCredentials({
        username: adminUsername,
        password: newTenantData.adminPassword,
        link: window.location.origin,
        whatsappSent: !!newTenantData.adminWhatsapp
      });
      
      setNewTenantData({
        companyName: '', companyNit: '', branchName: 'Casa Matriz', companyPrefix: '',
        adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '', adminWhatsapp: ''
      });
      
      fetchTenants();
    } catch (err) {
      console.error(err);
      alert('Error creando empresa: ' + err.message);
    } finally {
      setCreatingTenant(false);
    }
  };

  const handleDeleteTenant = async (tenantId, tenantName) => {
    if (!window.confirm(`⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás absolutamente seguro de que deseas ELIMINAR la empresa "${tenantName}"?\n\nEsta acción eliminará TODOS los datos asociados (usuarios, ventas, inventario) y NO se puede deshacer.`)) {
      return;
    }
    
    try {
      // 1. Eliminar imágenes del storage asociadas a este tenant
      try {
        const { data: files } = await supabase.storage.from('product_images').list(tenantId);
        if (files && files.length > 0) {
          const filePaths = files.map(file => `${tenantId}/${file.name}`);
          await supabase.storage.from('product_images').remove(filePaths);
        }
      } catch (storageErr) {
        console.warn('Error al borrar archivos de storage (puede que no existan):', storageErr);
      }

      // 2. Eliminar la BD y usuarios usando el RPC actualizado
      const { error } = await supabase.rpc('godmode_delete_tenant', {
        p_tenant_id: tenantId
      });
        
      if (error) throw error;
      
      alert('Empresa y todos sus datos eliminados exitosamente.');
      fetchTenants();
    } catch (err) {
      console.error(err);
      alert('Error eliminando la empresa. Es posible que haya datos vinculados que impidan su borrado. Detalle: ' + err.message);
    }
  };

  const handleImpersonate = async (tenantId) => {
    try {
      const { error } = await supabase.rpc('admin_impersonate_tenant', { p_tenant_id: tenantId });
      if (error) throw error;
      window.location.href = '/';
    } catch (err) {
      console.error(err);
      alert('Error al entrar como soporte: ' + err.message);
    }
  };

  const handleSendReminder = async (tenantId, plan, tenantWhatsapp) => {
    let phone = tenantWhatsapp;
    
    if (!phone) {
      phone = window.prompt(`Esta empresa no tiene configurado su WhatsApp. Ingrese el número del cliente para enviarle el aviso (Ej: 77777777):`);
      if (!phone) return;
      
      // Intentar guardar el teléfono en la base de datos para la próxima vez
      try {
        await supabase.from('tenants').update({ whatsapp_number: phone }).eq('id', tenantId);
        setTenants(tenants.map(t => t.id === tenantId ? { ...t, whatsapp_number: phone } : t));
      } catch (err) {
        console.error("Error guardando el teléfono", err);
      }
    } else {
      const confirm = window.confirm(`¿Enviar aviso de cobro al número configurado de la empresa (${phone})?`);
      if (!confirm) return;
    }

    const message = `¡Hola! Te saludamos de Estación Digital. Este es un recordatorio automático de que tu suscripción mensual de tu sistema (Plan: ${plan || 'BASIC'}) vence pronto. Por favor contáctanos para evitar la suspensión del servicio.`;

    try {
      const { error } = await supabase.rpc('godmode_send_whatsapp', { 
        p_tenant_id: tenantId,
        p_phone: phone,
        p_message: message
      });
      if (error) throw error;
      alert('Aviso de cobro enviado a la cola de WhatsApp exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Error al enviar el aviso: ' + err.message);
    }
  };

  const handleSubscriptionChange = async (tenantId, field, value) => {
    try {
      const { error } = await supabase.from('tenants').update({ [field]: value }).eq('id', tenantId);
      if (error) throw error;
      fetchTenants(); // Recargar datos
    } catch (err) {
      console.error(err);
      alert(`Error actualizando suscripción: ` + err.message);
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
      <PageHeader title="Acceso Denegado / God Mode" icon={ShieldAlert}>
        <div>
          
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Gestiona los módulos y páginas individuales de cada inquilino de forma granular.</p>
        </div>
        <button 
          className="glass-button" 
          onClick={() => { setShowCreateModal(true); setGeneratedCredentials(null); setNewTenantData({ companyName: '', companyNit: '', branchName: 'Principal', companyPrefix: '', adminFirstName: '', adminLastName: '', adminPassword: '' }); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', color: 'white' }}
        >
           Crear Nueva Empresa
        </button>
      </PageHeader>

      {botStatus === 'CONNECTED' ? (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px 16px', borderRadius: '12px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MessageCircle size={24} />
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Bot de WhatsApp En Línea</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Los avisos automáticos se enviarán con normalidad.</p>
          </div>
        </div>
      ) : (
        <div style={{ background: '#ef4444', color: 'white', padding: '16px', borderRadius: '12px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 20px rgba(239,68,68,0.3)' }}>
          <ShieldAlert size={32} />
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
              El Bot de WhatsApp está {botStatus === 'QR_READY' ? 'esperando vinculación' : 'desconectado'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              Los avisos de cobro no se enviarán hasta que escanees el código QR. <a href="http://localhost:3000" target="_blank" rel="noreferrer" style={{ color: 'white', textDecoration: 'underline', fontWeight: 'bold' }}>Haz clic aquí para ver el código QR y conectarlo</a>.
            </p>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="glass-panel" style={{ width: '600px', padding: '40px', position: 'relative', background: 'linear-gradient(145deg, rgba(30,30,40,0.9) 0%, rgba(15,15,20,0.95) 100%)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', borderRadius: '24px' }}>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <XCircle size={20} />
            </button>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              <Building2 size={28} color="var(--primary)" style={{ WebkitTextFillColor: 'initial' }} /> Crear Nueva Empresa
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '30px' }}>Completa los datos iniciales para aprovisionar un nuevo Tenant en la plataforma SaaS.</p>
            
            {!generatedCredentials ? (
              <form onSubmit={handleCreateTenant} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <h3 style={{ fontSize: '16px', color: 'var(--primary)', margin: '0 0 -10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>1. Datos de la Empresa</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Nombre Comercial</label>
                    <input type="text" className="glass-input" required value={newTenantData.companyName} onChange={e => setNewTenantData({...newTenantData, companyName: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="Ej. Ferretería El Sol" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>NIT / Identificación</label>
                    <input type="text" className="glass-input" required value={newTenantData.companyNit} onChange={e => setNewTenantData({...newTenantData, companyNit: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="0000-000000-000-0" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Prefijo Corto (ID) - ¡Importante para Usuario!</label>
                    <input type="text" className="glass-input" required value={newTenantData.companyPrefix} onChange={e => setNewTenantData({...newTenantData, companyPrefix: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="Ej. fersol" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Sucursal Base</label>
                    <input type="text" className="glass-input" required value={newTenantData.branchName} onChange={e => setNewTenantData({...newTenantData, branchName: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="Principal" />
                  </div>
                </div>

                <h3 style={{ fontSize: '16px', color: 'var(--primary)', margin: '10px 0 -10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>2. Cuenta del Administrador Principal</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Nombre</label>
                    <input type="text" className="glass-input" required value={newTenantData.adminFirstName} onChange={e => setNewTenantData({...newTenantData, adminFirstName: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="Ej. Juan" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Apellido</label>
                    <input type="text" className="glass-input" required value={newTenantData.adminLastName} onChange={e => setNewTenantData({...newTenantData, adminLastName: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="Ej. Pérez" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Correo Electrónico</label>
                    <input type="email" className="glass-input" required value={newTenantData.adminEmail} onChange={e => setNewTenantData({...newTenantData, adminEmail: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="ejemplo@correo.com" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>Contraseña de Acceso (Temporal)</label>
                    <input type="text" className="glass-input" required minLength="6" value={newTenantData.adminPassword} onChange={e => setNewTenantData({...newTenantData, adminPassword: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="Min. 6 caracteres" />
                  </div>
                  <div className="form-group" style={{ margin: 0, gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: 600 }}>WhatsApp del Cliente (Opcional)</label>
                    <input type="text" className="glass-input" value={newTenantData.adminWhatsapp} onChange={e => setNewTenantData({...newTenantData, adminWhatsapp: e.target.value})} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '14px', borderRadius: '12px', width: '100%' }} placeholder="Ej. 77777777" />
                  </div>
                </div>

                
                <div style={{ marginTop: '10px' }}>
                  <button type="submit" disabled={creatingTenant} className="glass-button" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)', color: 'white', justifyContent: 'center', width: '100%', padding: '16px', fontSize: '15px', fontWeight: 600, border: 'none', borderRadius: '12px', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)', transition: 'all 0.3s' }}>
                    {creatingTenant ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>⏳ Aprovisionando Infraestructura SaaS...</span>
                    ) : '🚀 Desplegar Nueva Empresa y Generar Enlace'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', textAlign: 'center', marginTop: '10px' }}>
                <div style={{ padding: '24px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#10b981', color: 'white', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}>
                    <Store size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 600 }}>¡Empresa y Usuario Creados Exitosamente!</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-main)', opacity: 0.9 }}>
                      {generatedCredentials.whatsappSent ? 
                        "Las credenciales ya han sido enviadas al cliente vía WhatsApp." :
                        "Copia y envía este mensaje a tu cliente para darle acceso inmediato al sistema."
                      }
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>*Mensaje de Bienvenida:*</p>
                  <textarea 
                    readOnly 
                    className="glass-input" 
                    style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', fontSize: '14px', color: '#60a5fa', height: '140px', resize: 'none', padding: '12px' }}
                    value={`¡Hola! Tu sistema en Estación Digital SV está listo.\n\n🔗 Link de acceso: ${generatedCredentials.link}\n👤 Usuario: ${generatedCredentials.username}\n🔑 Contraseña: ${generatedCredentials.password}\n\nPuedes cambiar tu contraseña dentro del sistema en la sección Configuración.`}
                  />
                  <button 
                    onClick={() => { navigator.clipboard.writeText(`¡Hola! Tu sistema en Estación Digital SV está listo.\n\n🔗 Link de acceso: ${generatedCredentials.link}\n👤 Usuario: ${generatedCredentials.username}\n🔑 Contraseña: ${generatedCredentials.password}\n\nPuedes cambiar tu contraseña dentro del sistema en la sección Configuración.`); alert('Mensaje copiado al portapapeles'); }}
                    className="glass-button" 
                    style={{ background: 'var(--primary)', padding: '10px 16px', borderRadius: '8px', border: 'none', width: '100%', justifyContent: 'center' }}
                    title="Copiar Mensaje"
                  >
                    <Copy size={18} /> Copiar Mensaje para el Cliente
                  </button>
                </div>
                
                <button onClick={() => setShowCreateModal(false)} className="glass-button" style={{ justifyContent: 'center', padding: '14px', fontSize: '15px', background: 'rgba(255,255,255,0.05)' }}>
                  Cerrar Ventana
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTenant(tenant.id, tenant.name); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Eliminar Empresa"
                  >
                    <Trash2 size={20} />
                  </button>

                  {expandedTenant === tenant.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </div>
              </div>

              {/* Granular Module Configuration */}
              {expandedTenant === tenant.id && (
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  
                  {/* Soporte y Suscripción */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                      <h3 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={18} color="var(--primary)" /> Soporte Técnico
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Entra a la plataforma de esta empresa con permisos de dueño para solucionar problemas.
                      </p>
                      <button 
                        className="glass-button" 
                        onClick={() => handleImpersonate(tenant.id)}
                        style={{ background: 'var(--primary)', color: 'white', width: '100%', justifyContent: 'center' }}
                      >
                        Entrar como Soporte
                      </button>
                    </div>

                    <div className="glass-panel" style={{ padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                      <h3 style={{ fontSize: '16px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={18} color="#10b981" /> Suscripción (SaaS)
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Plan:</span>
                          <select 
                            className="glass-input" 
                            style={{ width: '150px', padding: '6px' }}
                            value={tenant.subscription_plan || 'BASIC'}
                            onChange={(e) => handleSubscriptionChange(tenant.id, 'subscription_plan', e.target.value)}
                          >
                            <option value="BASIC">Basic</option>
                            <option value="PREMIUM">Premium</option>
                            <option value="ENTERPRISE">Enterprise</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Estado:</span>
                          <select 
                            className="glass-input" 
                            style={{ width: '150px', padding: '6px' }}
                            value={tenant.subscription_status || 'ACTIVE'}
                            onChange={(e) => handleSubscriptionChange(tenant.id, 'subscription_status', e.target.value)}
                          >
                            <option value="ACTIVE">Activa</option>
                            <option value="SUSPENDED">Suspendida</option>
                            <option value="CANCELED">Cancelada</option>
                          </select>
                        </div>
                        <button 
                          className="glass-button" 
                          onClick={() => handleSendReminder(tenant.id, tenant.subscription_plan, tenant.whatsapp_number)}
                          style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', width: '100%', justifyContent: 'center', marginTop: '10px', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                        >
                          <MessageCircle size={16} style={{ marginRight: '6px' }} /> Aviso de Cobro
                        </button>
                      </div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '16px', margin: '10px 0 0 0', color: 'var(--primary)' }}>Módulos y Permisos</h3>
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
