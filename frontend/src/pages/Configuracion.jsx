import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';
import { useTenantStore } from '../store/useTenantStore';
import { Save, Upload, Building2, Receipt, Image as ImageIcon, Package, Palette } from 'lucide-react';

const Configuracion = () => {
  const { user } = useAuth();
  const { tenantInfo, updateTenantInfo } = useTenantStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    nrc: '',
    nit: '',
    activity_desc: '',
    tax_iva: 13,
    receipt_message: '',
    logo_url: '',
    whatsapp_number: '',
    facebook_url: '',
    instagram_url: '',
    instagram_url: '',
    about_us: '',
    monthly_sales_goal: 15000,
    allow_negative_stock: true,
    primary_color: '#0f172a',
    store_slogan: '',
    theme: 'dark'
  });

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
        theme: tenantInfo.theme || 'dark'
      });
      setPreviewUrl(tenantInfo.logo_url || '');
      setPreviewBannerUrl(tenantInfo.hero_banner_url || '');
    }
  }, [tenantInfo]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

    const { error: uploadError } = await supabase.storage
      .from('tenant_logos')
      .upload(filePath, logoFile, { upsert: true });

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

    // Reutilizaremos el bucket tenant_logos para los banners también por simplicidad, o product_images.
    const { error: uploadError } = await supabase.storage
      .from('tenant_logos')
      .upload(filePath, bannerFile, { upsert: true });

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
          hero_banner_url: await uploadBanner()
        })
        .eq('id', tenantInfo.id);

      if (error) throw error;

      updateTenantInfo({
        company_name: formData.name,
        nrc: formData.nrc,
        nit: formData.nit,
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
        hero_banner_url: previewBannerUrl || tenantInfo.hero_banner_url
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

  if (!tenantInfo) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Configuración de Empresa</h1>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
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

        {/* Diseño de Tienda Virtual */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Palette size={20} color="var(--primary)" /> Diseño de la Tienda Virtual
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div>
                <label>Color Principal del Tema</label>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Elige el color corporativo que pintará la tienda</p>
              </div>
              <input 
                type="color" 
                name="primary_color" 
                value={formData.primary_color} 
                onChange={handleInputChange} 
                style={{ width: '60px', height: '40px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }}
              />
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
          </div>
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

        {/* Tienda Virtual / Storefront */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={20} color="var(--primary)" /> Tienda Virtual
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
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label>Acerca de Nosotros (Aparecerá en el pie de página de la tienda)</label>
            <textarea 
              className="glass-input" 
              name="about_us" 
              value={formData.about_us} 
              onChange={handleInputChange} 
              rows={3}
              placeholder="Ej. Somos una empresa salvadoreña dedicada a..."
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Configuracion;
