import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useTenantStore } from '../store/useTenantStore';
import { Save, Upload, Building2, Receipt, Image as ImageIcon, Package, Palette, Settings, Store } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const Configuracion = () => {
  const { user } = useAuth();
  const { tenantInfo, updateTenantInfo } = useTenantStore();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab') || 'general';
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState([]);
  const [savingBranches, setSavingBranches] = useState(false);
  const [activeTab, setActiveTab] = useState(tabParam);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [formData, setFormData] = useState({
    name: '',
    nrc: '',
    nit: '',
    tenant_prefix: '',
    activity_desc: '',
    tax_iva: 13,
    receipt_message: '',
    logo_url: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    about_us: '',
    monthly_sales_goal: 15000,
    allow_negative_stock: true,
    primary_color: '#0f172a',
    store_slogan: '',
    theme: 'dark',
    dte_enabled: false,
    dte_environment: 'TEST',
    dte_password_api: '',
    dte_username_api: '',
    store_promo_message: '',
    store_catalog_mode: false,
    store_button_text: 'AÑADIR AL CARRITO',
    store_shipping_cost: 0.00,
    tiktok_url: '',
    store_show_whatsapp_float: true,
    store_primary_text_color: '#ffffff'
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const [logoFile, setLogoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [bannerFile, setBannerFile] = useState(null);
  const [previewBannerUrl, setPreviewBannerUrl] = useState('');

  useEffect(() => {
    if (tenantInfo) {
      setFormData({
        name: tenantInfo.company_name || tenantInfo.name || '',
        nrc: tenantInfo.nrc || '',
        nit: tenantInfo.nit || '',
        tenant_prefix: tenantInfo.tenant_prefix || '',
        activity_desc: tenantInfo.activity_desc || '',
        tax_iva: tenantInfo.tax_iva || 13,
        receipt_message: tenantInfo.receipt_message || '',
        logo_url: tenantInfo.logo_url || '',
        whatsapp_number: tenantInfo.whatsapp_number || '',
        facebook_url: tenantInfo.facebook_url || '',
        instagram_url: tenantInfo.instagram_url || '',
        about_us: tenantInfo.about_us || '',
        monthly_sales_goal: tenantInfo.monthly_sales_goal || 15000,
        allow_negative_stock: tenantInfo.allow_negative_stock !== false,
        primary_color: tenantInfo.primary_color || '#0f172a',
        store_slogan: tenantInfo.store_slogan || '',
        theme: tenantInfo.theme || 'dark',
        dte_enabled: tenantInfo.dte_enabled || false,
        dte_environment: tenantInfo.dte_environment || 'TEST',
        dte_password_api: '', // Nunca cargamos la contraseña encriptada en la vista
        dte_username_api: tenantInfo.dte_username_api || '',
        store_promo_message: tenantInfo.store_promo_message || '',
        store_catalog_mode: tenantInfo.store_catalog_mode || false,
        store_button_text: tenantInfo.store_button_text || 'AÑADIR AL CARRITO',
        store_shipping_cost: tenantInfo.store_shipping_cost || 0.00,
        tiktok_url: tenantInfo.tiktok_url || '',
        store_show_whatsapp_float: tenantInfo.store_show_whatsapp_float !== false,
        store_primary_text_color: tenantInfo.store_primary_text_color || '#ffffff'
      });
      setPreviewUrl(tenantInfo.logo_url || '');
      setPreviewBannerUrl(tenantInfo.hero_banner_url || '');
      
      // Fetch branches
      const fetchBranches = async () => {
        const { data, error } = await supabase
          .from('branches')
          .select('*')
          .eq('tenant_id', tenantInfo.id);
        if (!error && data) {
          setBranches(data);
        }
      };
      fetchBranches();
    }
  }, [tenantInfo]);

  const handleInputChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return formData.logo_url;
    
    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${tenantInfo.id}_${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    let fileToUpload = logoFile;
    try {
      const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true };
      fileToUpload = await imageCompression(logoFile, options);
    } catch (error) {
      console.error('Error compressing logo:', error);
    }

    const { error: uploadError } = await supabase.storage
      .from('tenant_logos')
      .upload(filePath, fileToUpload, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('tenant_logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const uploadBanner = async () => {
    if (!bannerFile) return tenantInfo.hero_banner_url || '';
    
    const fileExt = bannerFile.name.split('.').pop();
    const fileName = `banner_${tenantInfo.id}_${Date.now()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    let fileToUpload = bannerFile;
    try {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1920, useWebWorker: true };
      fileToUpload = await imageCompression(bannerFile, options);
    } catch (error) {
      console.error('Error compressing banner:', error);
    }

    const { error: uploadError } = await supabase.storage
      .from('tenant_logos')
      .upload(filePath, fileToUpload, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('tenant_logos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newLogoUrl = await uploadLogo();
      
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          nrc: formData.nrc,
          nit: formData.nit,
          tenant_prefix: formData.tenant_prefix,
          activity_desc: formData.activity_desc,
          tax_iva: formData.tax_iva,
          receipt_message: formData.receipt_message,
          logo_url: newLogoUrl,
          whatsapp_number: formData.whatsapp_number,
          facebook_url: formData.facebook_url,
          instagram_url: formData.instagram_url,
          about_us: formData.about_us,
          monthly_sales_goal: Number(formData.monthly_sales_goal),
          allow_negative_stock: formData.allow_negative_stock,
          primary_color: formData.primary_color,
          store_slogan: formData.store_slogan,
          theme: formData.theme,
          hero_banner_url: await uploadBanner(),
          store_promo_message: formData.store_promo_message,
          store_catalog_mode: formData.store_catalog_mode,
          store_button_text: formData.store_button_text,
          store_shipping_cost: formData.store_shipping_cost,
          tiktok_url: formData.tiktok_url,
          store_show_whatsapp_float: formData.store_show_whatsapp_float,
          store_primary_text_color: formData.store_primary_text_color
        })
        .eq('id', tenantInfo.id);

      if (error) throw error;

      // 2. Guardar Configuración DTE de forma segura (RPC)
      const { error: dteError } = await supabase.rpc('save_dte_credentials', {
        p_tenant_id: tenantInfo.id,
        p_enabled: formData.dte_enabled,
        p_environment: formData.dte_environment,
        p_username: formData.dte_username_api,
        p_password: formData.dte_password_api
      });

      if (dteError) throw dteError;

      updateTenantInfo({
        company_name: formData.name,
        nrc: formData.nrc,
        nit: formData.nit,
        tenant_prefix: formData.tenant_prefix,
        activity_desc: formData.activity_desc,
        tax_iva: formData.tax_iva,
        receipt_message: formData.receipt_message,
        logo_url: newLogoUrl,
        whatsapp_number: formData.whatsapp_number,
        facebook_url: formData.facebook_url,
        instagram_url: formData.instagram_url,
        about_us: formData.about_us,
        monthly_sales_goal: Number(formData.monthly_sales_goal),
        allow_negative_stock: formData.allow_negative_stock,
        primary_color: formData.primary_color,
        store_slogan: formData.store_slogan,
        theme: formData.theme,
        dte_enabled: formData.dte_enabled,
        dte_environment: formData.dte_environment,
        dte_username_api: formData.dte_username_api,
        // dte_password_api no lo actualizamos en el estado local por seguridad
        hero_banner_url: previewBannerUrl || tenantInfo.hero_banner_url,
        store_promo_message: formData.store_promo_message,
        store_catalog_mode: formData.store_catalog_mode,
        store_button_text: formData.store_button_text,
        store_shipping_cost: formData.store_shipping_cost,
        tiktok_url: formData.tiktok_url,
        store_show_whatsapp_float: formData.store_show_whatsapp_float,
        store_primary_text_color: formData.store_primary_text_color
      });

      alert('Configuración guardada exitosamente. Si cambiaste el tema, recarga la página para ver los cambios completos.');
      
      if (formData.theme !== tenantInfo.theme) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBranchChange = (index, field, value) => {
    const updatedBranches = [...branches];
    updatedBranches[index][field] = value;
    setBranches(updatedBranches);
  };

  const createNewBranch = async () => {
    const branchName = prompt('Nombre de la nueva sucursal:');
    if (!branchName) return;

    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([{
          tenant_id: tenantInfo.id,
          name: branchName,
          establishment_code: '0000',
          point_of_sale_code: '0000'
        }])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setBranches([...branches, data[0]]);
        alert('Sucursal creada exitosamente.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al crear sucursal: ' + err.message);
    }
  };

  const saveBranches = async () => {
    setSavingBranches(true);
    try {
      for (const branch of branches) {
        const { error } = await supabase
          .from('branches')
          .update({
            dte_resolution_number: branch.dte_resolution_number,
            dte_series: branch.dte_series,
            dte_correlative_fcf: branch.dte_correlative_fcf,
            dte_correlative_ccf: branch.dte_correlative_ccf,
            dte_correlative_fex: branch.dte_correlative_fex
          })
          .eq('id', branch.id);
        if (error) throw error;
      }
      alert('Configuración de sucursales guardada exitosamente.');
    } catch (err) {
      console.error(err);
      alert('Error al guardar sucursales: ' + err.message);
    } finally {
      setSavingBranches(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return alert('Las contraseñas no coinciden.');
    }
    if (passwordData.newPassword.length < 6) {
      return alert('La contraseña debe tener al menos 6 caracteres.');
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      if (error) throw error;
      
      alert('¡Contraseña actualizada exitosamente!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      alert('Error al cambiar contraseña: ' + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (!tenantInfo) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">
            Configuración {activeTab === 'facturacion' ? 'DTE' : activeTab === 'sistema' ? 'ERP' : activeTab === 'tienda' ? 'Tienda' : 'General'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'monospace' }}>
            Tenant ID: {tenantInfo.id}
          </p>
        </div>
        <button 
          className="glass-button" 
          onClick={handleSave} 
          disabled={saving}
          style={{ background: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)' }} className="hide-scrollbar">
        {[
          { id: 'general', label: 'General', icon: Building2 },
          { id: 'facturacion', label: 'Facturación & DTE', icon: Receipt },
          { id: 'sistema', label: 'Sistema ERP', icon: Settings },
          { id: 'tienda', label: 'Tienda Virtual', icon: Store }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px', border: 'none',
                background: isActive ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.08)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* ======================= TAB: GENERAL ======================= */}
        {activeTab === 'general' && (
          <>
            {/* Panel de Logo */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} color="var(--primary)" /> Logo de la Empresa
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ 
              width: '120px', height: '120px', 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px dashed var(--border-color)',
              borderRadius: '12px',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              overflow: 'hidden'
            }}>
              {previewUrl ? (
                <img src={previewUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sin Logo</span>
              )}
            </div>
            <div>
              <input 
                type="file" 
                accept="image/*" 
                id="logo-upload" 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
              />
              <label 
                htmlFor="logo-upload" 
                className="glass-button" 
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Upload size={16} /> Subir Imagen
              </label>
              <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Sube un logo en formato PNG o JPG.<br/>Se recomienda un fondo transparente.
              </p>
            </div>
          </div>
        </div>

            {/* Datos Legales */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="var(--primary)" /> Datos Comerciales
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Nombre Comercial</label>
                  <input type="text" className="glass-input" name="name" value={formData.name} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Actividad Económica</label>
                  <input type="text" className="glass-input" name="activity_desc" value={formData.activity_desc} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>NRC (Número de Registro)</label>
                  <input type="text" className="glass-input" name="nrc" value={formData.nrc} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>NIT</label>
                  <input type="text" className="glass-input" name="nit" value={formData.nit} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label>Prefijo de Empresa (Para Usuarios)</label>
                  <input type="text" className="glass-input" name="tenant_prefix" value={formData.tenant_prefix} onChange={handleInputChange} placeholder="Ej. miemp" />
                </div>
              </div>
            </div>

            {/* Seguridad / Contraseña */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> 
                Seguridad de la Cuenta
              </h2>
              <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Nueva Contraseña</label>
                  <input type="password" required className="glass-input" minLength="6" value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Confirmar Nueva Contraseña</label>
                  <input type="password" required className="glass-input" minLength="6" value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} placeholder="Repite la contraseña" />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <button type="submit" disabled={changingPassword} className="glass-button" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    {changingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                  </button>
                </div>
              </form>
            </div>

            {/* Metas y Objetivos */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Receipt size={20} color="var(--primary)" /> Metas y Objetivos
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Meta de Ventas Mensual ($)</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    name="monthly_sales_goal" 
                    value={formData.monthly_sales_goal} 
                    onChange={handleInputChange} 
                    style={{ width: '200px' }} 
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Esta meta alimentará el medidor de progreso en el Dashboard Comercial.</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ======================= TAB: SISTEMA ======================= */}
        {activeTab === 'sistema' && (
          <>
            {/* Apariencia del Sistema ERP */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={20} color="var(--primary)" /> Apariencia del Sistema ERP
          </h2>
          <div className="form-group">
            <label>Tema Visual</label>
            <select 
              className="glass-input" 
              name="theme" 
              value={formData.theme} 
              onChange={handleInputChange}
            >
              <option value="dark">Oscuro (Elegante y Moderno)</option>
              <option value="light">Claro (Limpio y Brillante)</option>
              <option value="barbie">Barbie (Pink Glass)</option>
              <option value="maxsteel">Max Steel (Cyan Tech)</option>
              <option value="mario">Mario Bros (Retro 8-bit)</option>
              <option value="cyberpunk">Cyberpunk (Neón)</option>
              <option value="retro">Terminal (Hacker Verde)</option>
              <option value="ocean">Océano (Azules Profundos)</option>
              <option value="forest">Bosque (Verdes y Naturaleza)</option>
              <option value="sunset">Atardecer (Cálido y Naranja)</option>
              <option value="dracula">Drácula (Morado y Oscuro)</option>
              <option value="cupcake">Cupcake (Pastel y Claro)</option>
            </select>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>El cambio de tema se aplicará a todas las pantallas de tu sistema operativo comercial.</p>
          </div>
        </div>

            {/* Inventario */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="var(--primary)" /> Ajustes de Inventario
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <input 
                    type="checkbox" 
                    id="allow_negative_stock" 
                    checked={formData.allow_negative_stock} 
                    onChange={(e) => setFormData({...formData, allow_negative_stock: e.target.checked})}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label htmlFor="allow_negative_stock" style={{ margin: 0, cursor: 'pointer' }}>
                    <span style={{ fontWeight: 600, display: 'block' }}>Permitir vender sin stock (Ventas en Negativo)</span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Si está activo, el sistema permitirá facturar aunque el inventario llegue a cero.</span>
                  </label>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ======================= TAB: TIENDA VIRTUAL ======================= */}
        {activeTab === 'tienda' && (
          <>
            {/* Diseño de Tienda Virtual */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={20} color="var(--primary)" /> Diseño de la Tienda Virtual
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <label>Color Principal del Tema</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Fondo de los encabezados</p>
                </div>
                <input 
                  type="color" 
                  name="primary_color" 
                  value={formData.primary_color} 
                  onChange={handleInputChange} 
                  style={{ width: '60px', height: '40px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <label>Color de Letra (Sobre Principal)</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>El texto de los encabezados</p>
                </div>
                <input 
                  type="color" 
                  name="store_primary_text_color" 
                  value={formData.store_primary_text_color} 
                  onChange={handleInputChange} 
                  style={{ width: '60px', height: '40px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Slogan de la Tienda (Banner Principal)</label>
              <input 
                type="text" 
                className="glass-input" 
                name="store_slogan" 
                value={formData.store_slogan} 
                onChange={handleInputChange} 
                placeholder="Ej. Todo tiene solución"
              />
            </div>

            <div className="form-group">
              <label>Imagen del Banner Principal (Hero)</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginTop: '12px' }}>
                <div style={{ 
                  width: '300px', height: '120px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px dashed var(--border-color)',
                  borderRadius: '12px',
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  overflow: 'hidden'
                }}>
                  {previewBannerUrl ? (
                    <img src={previewBannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Sin Banner</span>
                  )}
                </div>
                <div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    id="banner-upload" 
                    style={{ display: 'none' }} 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setBannerFile(file);
                        setPreviewBannerUrl(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <label 
                    htmlFor="banner-upload" 
                    className="glass-button" 
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <Upload size={16} /> Cambiar Banner
                  </label>
                  <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Recomendado: 1920x600 px (Horizontal).
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="var(--primary)" /> Configuraciones Avanzadas (Tienda)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <input 
                type="checkbox" 
                id="store_catalog_mode" 
                name="store_catalog_mode"
                checked={formData.store_catalog_mode} 
                onChange={handleInputChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="store_catalog_mode" style={{ margin: 0, cursor: 'pointer' }}>
                <span style={{ fontWeight: 600, display: 'block' }}>Activar Modo Catálogo</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Oculta los precios y el carrito. El botón de compra enviará al cliente directo a tu WhatsApp.</span>
              </label>
            </div>

            <div className="form-group">
              <label>Mensaje de Barra Superior (Promo Bar)</label>
              <input 
                type="text" 
                className="glass-input" 
                name="store_promo_message" 
                value={formData.store_promo_message} 
                onChange={handleInputChange} 
                placeholder="Ej. ¡Envío gratis por compras mayores a $50!"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>Texto del Botón de Compra</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  name="store_button_text" 
                  value={formData.store_button_text} 
                  onChange={handleInputChange} 
                  placeholder="Ej. AÑADIR AL CARRITO"
                />
              </div>
              
              <div className="form-group">
                <label>Costo Fijo de Envío Estándar ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="glass-input" 
                  name="store_shipping_cost" 
                  value={formData.store_shipping_cost} 
                  onChange={handleInputChange} 
                />
              </div>
            </div>
            
          </div>
        </div>

            {/* Tienda Virtual / Storefront */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="var(--primary)" /> Redes y Contacto
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>WhatsApp de Ventas</label>
                  <input type="text" className="glass-input" name="whatsapp_number" value={formData.whatsapp_number} onChange={handleInputChange} placeholder="+503 7777-7777" />
                </div>
                <div className="form-group">
                  <label>Link de Facebook</label>
                  <input type="text" className="glass-input" name="facebook_url" value={formData.facebook_url} onChange={handleInputChange} placeholder="https://facebook.com/..." />
                </div>
                <div className="form-group">
                  <label>Link de Instagram</label>
                  <input type="text" className="glass-input" name="instagram_url" value={formData.instagram_url} onChange={handleInputChange} placeholder="https://instagram.com/..." />
                </div>
                <div className="form-group">
                  <label>Link de TikTok</label>
                  <input type="text" className="glass-input" name="tiktok_url" value={formData.tiktok_url} onChange={handleInputChange} placeholder="https://tiktok.com/@..." />
                </div>
              </div>
              
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '16px' }}>
                <input 
                  type="checkbox" 
                  id="store_show_whatsapp_float" 
                  name="store_show_whatsapp_float"
                  checked={formData.store_show_whatsapp_float} 
                  onChange={handleInputChange}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="store_show_whatsapp_float" style={{ margin: 0, cursor: 'pointer' }}>
                  <span style={{ fontWeight: 600, display: 'block' }}>Mostrar Botón Flotante de WhatsApp</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Muestra un botón verde fijo en la esquina inferior para contacto rápido.</span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Acerca de Nosotros (Aparecerá en el pie de página de la tienda)</label>
                <textarea 
                  className="glass-input" 
                  name="about_us" 
                  value={formData.about_us} 
                  onChange={handleInputChange} 
                  rows={4}
                  placeholder="Ej. Somos una empresa comprometida con..."
                />
              </div>
            </div>
          </>
        )}

        {/* ======================= TAB: FACTURACIÓN ======================= */}
        {activeTab === 'facturacion' && (
          <>
            {/* Facturación */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={20} color="var(--primary)" /> Ajustes de Facturación
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Porcentaje de IVA (%)</label>
              <input type="number" className="glass-input" name="tax_iva" value={formData.tax_iva} onChange={handleInputChange} style={{ width: '150px' }} />
            </div>
            <div className="form-group">
              <label>Mensaje al pie del Ticket</label>
              <textarea 
                className="glass-input" 
                name="receipt_message" 
                value={formData.receipt_message} 
                onChange={handleInputChange} 
                rows={3}
                placeholder="Ej. ¡Gracias por su compra, vuelva pronto!"
              />
            </div>
          </div>
        </div>

        {/* Facturación Electrónica (MH) */}
        <div className="glass-panel" style={{ padding: '24px', border: formData.dte_enabled ? '1px solid var(--primary)' : '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={20} color={formData.dte_enabled ? "var(--primary)" : "var(--text-muted)"} /> 
            Facturación Electrónica (Ministerio de Hacienda)
          </h2>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <input 
              type="checkbox" 
              id="dte_enabled" 
              name="dte_enabled"
              checked={formData.dte_enabled} 
              onChange={handleInputChange}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="dte_enabled" style={{ margin: 0, cursor: 'pointer' }}>
              <span style={{ fontWeight: 600, display: 'block' }}>Activar Facturación Electrónica (DTE)</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Si está activo, las ventas se enviarán al MH para validación. Si está inactivo, se generarán tickets internos.</span>
            </label>
          </div>

          {formData.dte_enabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <div className="form-group">
                <label>Ambiente</label>
                <select className="glass-input" name="dte_environment" value={formData.dte_environment} onChange={handleInputChange}>
                  <option value="TEST">Pruebas (TEST)</option>
                  <option value="PROD">Producción (PROD)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Usuario API (MH)</label>
                <input type="text" className="glass-input" name="dte_username_api" value={formData.dte_username_api} onChange={handleInputChange} placeholder="NIT o Usuario" />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Contraseña API (MH)</label>
                <input type="password" className="glass-input" name="dte_password_api" value={formData.dte_password_api} onChange={handleInputChange} placeholder={tenantInfo.dte_username_api ? "•••••••• (Guardada)" : "••••••••"} />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {tenantInfo.dte_username_api ? "La contraseña está guardada de forma segura (encriptada). Escribe una nueva solo si deseas cambiarla." : "Asegúrate de ingresar la contraseña correcta asignada por el MH para la transmisión de DTEs."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sucursales (Siempre visible) */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="var(--primary)" /> Sucursales {formData.dte_enabled && "y Correlativos DTE"}
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="glass-button" 
                onClick={createNewBranch} 
                style={{ background: 'rgba(255,255,255,0.1)', padding: '6px 12px', fontSize: '13px' }}
              >
                + Nueva Sucursal
              </button>
              <button 
                className="glass-button" 
                onClick={saveBranches} 
                disabled={savingBranches}
                style={{ background: 'var(--primary)', padding: '6px 12px', fontSize: '13px' }}
              >
                {savingBranches ? 'Guardando...' : 'Guardar Sucursales'}
              </button>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {branches.map((branch, index) => (
              <div key={branch.id} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--text-light)' }}>
                  {branch.name}
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div className="form-group">
                    <label>Nombre</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={branch.name || ''} 
                      onChange={(e) => handleBranchChange(index, 'name', e.target.value)} 
                    />
                  </div>

                  {formData.dte_enabled && (
                    <>
                      <div className="form-group">
                        <label>Nº Resolución MH</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={branch.dte_resolution_number || ''} 
                          onChange={(e) => handleBranchChange(index, 'dte_resolution_number', e.target.value)} 
                          placeholder="Ej. 15000-RES-..."
                        />
                      </div>
                      <div className="form-group">
                        <label>Serie DTE</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={branch.dte_series || ''} 
                          onChange={(e) => handleBranchChange(index, 'dte_series', e.target.value)} 
                          placeholder="Ej. 24SV0001"
                        />
                      </div>
                      <div className="form-group">
                        <label>Correlativo FCF</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={branch.dte_correlative_fcf || ''} 
                          onChange={(e) => handleBranchChange(index, 'dte_correlative_fcf', parseInt(e.target.value) || 1)} 
                        />
                      </div>
                      <div className="form-group">
                        <label>Correlativo CCF</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={branch.dte_correlative_ccf || ''} 
                          onChange={(e) => handleBranchChange(index, 'dte_correlative_ccf', parseInt(e.target.value) || 1)} 
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Configuracion;
