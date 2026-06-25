import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, X, UploadCloud, DownloadCloud, Settings, Trash } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';

const Catalogo = () => {
  const { tenantInfo } = useTenantStore();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configType, setConfigType] = useState('category');
  const [uploadingCatImage, setUploadingCatImage] = useState(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', barcode: '', description: '', category: '', brand: '',
    price: '', cost: '', target_margin: '', is_taxable: true,
    units_per_box: 1, box_price: '', is_service: false,
    is_subscription: false, subscription_days: 30,
    show_on_web: false, image_url: '', parent_id: null, variant_name: ''
  });

  const fetchProducts = async () => {
    setLoading(true);
    const [prodRes, catRes, brandRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('product_categories').select('*').order('name'),
      supabase.from('product_brands').select('*').order('name')
    ]);
    if (!prodRes.error && prodRes.data) setProducts(prodRes.data);
    if (!catRes.error && catRes.data) setCategories(catRes.data);
    if (!brandRes.error && brandRes.data) setBrands(brandRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleAddCategory = async () => {
    const name = window.prompt("Nueva Categoría:");
    if (!name || name.trim() === '') return;
    const { data, error } = await supabase.from('product_categories').insert([{ tenant_id: tenantInfo.id, name: name.trim() }]).select();
    if (error) {
      if(error.code === '23505') alert("La categoría ya existe.");
      else alert("Error: " + error.message);
    } else if (data) {
      setCategories([...categories, data[0]].sort((a,b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, category: data[0].name });
    }
  };

  const handleAddBrand = async () => {
    const name = window.prompt("Nueva Marca:");
    if (!name || name.trim() === '') return;
    const { data, error } = await supabase.from('product_brands').insert([{ tenant_id: tenantInfo.id, name: name.trim() }]).select();
    if (error) {
      if(error.code === '23505') alert("La marca ya existe.");
      else alert("Error: " + error.message);
    } else if (data) {
      setBrands([...brands, data[0]].sort((a,b) => a.name.localeCompare(b.name)));
      setFormData({ ...formData, brand: data[0].name });
    }
  };

  const handleDeleteConfig = async (id, type) => {
    if (!window.confirm(`¿Estás seguro de eliminar est${type === 'category' ? 'a categoría' : 'a marca'}?`)) return;
    
    try {
      const table = type === 'category' ? 'product_categories' : 'product_brands';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      
      if (type === 'category') {
        setCategories(categories.filter(c => c.id !== id));
        if (formData.category === categories.find(c => c.id === id)?.name) {
          setFormData({ ...formData, category: '' });
        }
      } else {
        setBrands(brands.filter(b => b.id !== id));
        if (formData.brand === brands.find(b => b.id === id)?.name) {
          setFormData({ ...formData, brand: '' });
        }
      }
    } catch (error) {
      alert('Error al eliminar: ' + error.message);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: '', sku: '', barcode: '', description: '', category: '', brand: '', price: '', cost: '', target_margin: '', is_taxable: true, units_per_box: 1, box_price: '', is_service: false, is_subscription: false, subscription_days: 30, show_on_web: false, image_url: '', parent_id: null, variant_name: '' });
    setShowModal(true);
  };

  const openEdit = (prod) => {
    setEditingId(prod.id);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      barcode: prod.barcode || '',
      description: prod.description || '',
      category: prod.category || '',
      brand: prod.brand || '',
      price: prod.price,
      cost: prod.cost,
      target_margin: prod.target_margin || '',
      is_taxable: prod.is_taxable,
      units_per_box: prod.units_per_box || 1,
      box_price: prod.box_price || prod.price,
      is_service: prod.is_service || false,
      is_subscription: prod.is_subscription || false,
      subscription_days: prod.subscription_days || 30,
      show_on_web: prod.show_on_web || false,
      image_url: prod.image_url || '',
      parent_id: prod.parent_id || null,
      variant_name: prod.variant_name || '',
    });
    setShowModal(true);
  };

  const handleMarginChange = (val) => {
    const m = parseFloat(val) || 0;
    const c = parseFloat(formData.cost) || 0;
    if (c > 0) {
      const p = c * (1 + m / 100);
      setFormData({ ...formData, target_margin: val, price: p.toFixed(2) });
    } else {
      setFormData({ ...formData, target_margin: val });
    }
  };

  const handlePriceChange = (val) => {
    const p = parseFloat(val) || 0;
    const c = parseFloat(formData.cost) || 0;
    let m = formData.target_margin;
    if (c > 0) {
      m = (((p / c) - 1) * 100).toFixed(2);
    } else {
      m = 100;
    }
    setFormData({ ...formData, price: val, target_margin: m });
  };

  const handleImageUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${tenantInfo?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: data.publicUrl });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCategoryImageUpload = async (e, categoryId) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingCatImage(categoryId);
      const fileExt = file.name.split('.').pop();
      const fileName = `cat_${categoryId}_${Date.now()}.${fileExt}`;
      const filePath = `${tenantInfo?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('product_images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('product_categories')
        .update({ image_url: data.publicUrl })
        .eq('id', categoryId);

      if (updateError) throw updateError;

      setCategories(categories.map(c => c.id === categoryId ? { ...c, image_url: data.publicUrl } : c));
    } catch (error) {
      console.error('Error uploading category image:', error);
      alert('Error al subir la imagen de categoría: ' + error.message);
    } finally {
      setUploadingCatImage(null);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('tenant_id, branch_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No se encontró el perfil de empresa.');

      const payload = {
        tenant_id: profile.tenant_id,
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        description: formData.description,
        category: formData.category,
        brand: formData.brand,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost) || 0,
        target_margin: parseFloat(formData.target_margin) || 0,
        is_taxable: formData.is_taxable,
        units_per_box: parseInt(formData.units_per_box) || 1,
        box_price: parseFloat(formData.box_price) || parseFloat(formData.price),
        is_service: formData.is_service,
        is_subscription: formData.is_subscription,
        subscription_days: parseInt(formData.subscription_days) || 30,
        show_on_web: formData.show_on_web,
        image_url: formData.image_url,
        parent_id: formData.parent_id,
        variant_name: formData.variant_name
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([{ ...payload, tenant_id: profile.tenant_id }])
          .select()
          .single();
        if (insertError) throw insertError;

        if (profile.branch_id && !payload.is_service && !payload.is_subscription) {
          await supabase.from('inventory').insert([{
            tenant_id: profile.tenant_id,
            branch_id: profile.branch_id,
            product_id: newProduct.id,
            stock: 0,
          }]);
        }
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este artículo del catálogo? Esto también eliminará su registro de inventario.')) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
  };

  const handleDownloadTemplate = () => {
    const headers = "SKU,Nombre,Descripcion,Categoria,Precio,Costo,EsGravado,CodigoBarras\n";
    const example = "PROD-001,Laptop HP,Laptop empresarial,Tecnologia,1000.00,800.00,SI,123456789\n";
    const blob = new Blob([headers + example], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "Plantilla_Catalogo.csv";
    link.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('user_profiles').select('tenant_id, branch_id').eq('id', userData.user.id).single();
      
      const text = await file.text();
      const rows = text.split('\n').map(r => r.trim()).filter(r => r);
      rows.shift(); // Remove header

      const parseCSVRow = (str) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < str.length; i++) {
          if (str[i] === '"') {
            inQuotes = !inQuotes;
          } else if (str[i] === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += str[i];
          }
        }
        result.push(cur.trim());
        return result;
      };

      let insertedCount = 0;
      for (const row of rows) {
        const vals = parseCSVRow(row);
        if (vals.length >= 6) {
          const sku = vals[0];
          const name = vals[1];
          const desc = vals[2] || '';
          const cat = vals[3] || '';
          const price = parseFloat(vals[4]) || 0;
          const cost = parseFloat(vals[5]) || 0;
          const isTaxable = (vals[6] || '').toUpperCase() === 'SI';
          const barcode = vals[7] || null;
          
          let margin = 0;
          if (cost > 0) margin = (((price / cost) - 1) * 100).toFixed(2);

          const { data: newProd, error: insertError } = await supabase.from('products').insert([{
            tenant_id: profile.tenant_id,
            sku, barcode, name, description: desc, category: cat, price, cost, target_margin: margin, is_taxable: isTaxable
          }]).select().single();
          
          if (!insertError && profile.branch_id) {
            await supabase.from('inventory').insert([{
              tenant_id: profile.tenant_id,
              branch_id: profile.branch_id,
              product_id: newProd.id,
              stock: 0
            }]);
          }
          if(!insertError) insertedCount++;
        }
      }
      
      alert(`✅ Carga Masiva completada.\nSe insertaron ${insertedCount} productos al catálogo.`);
      fetchProducts();
    } catch (error) {
      console.error(error);
      alert('Error en la carga masiva: ' + error.message);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Catálogo de Artículos</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="glass-button" style={{ background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }} onClick={handleDownloadTemplate}>
            <DownloadCloud size={18} /> Descargar Plantilla
          </button>
          
          <label className="glass-button" style={{ background: '#10b981', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={18} /> Subir CSV
            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
          </label>

          <button className="glass-button" onClick={openNew}>
            <Plus size={18} /> Nuevo Artículo
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ marginBottom: '20px', position: 'relative', maxWidth: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="glass-input"
            placeholder="Buscar por nombre, SKU, código de barras o categoría..."
            style={{ paddingLeft: '40px' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando catálogo...</div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p>No hay artículos en el catálogo.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Crea tu primer artículo para poder comprarlo y venderlo.</p>
          </div>
        ) : (
          <table className="glass-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Marca / Categoría</th>
                <th>Costo</th>
                <th>Margen (%)</th>
                <th>Precio Venta</th>
                <th>IVA</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(prod => (
                <tr key={prod.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-muted)' }}>
                    <div>{prod.sku}</div>
                    {prod.barcode && <div style={{ fontSize: '10px', color: '#94a3b8' }}>{prod.barcode}</div>}
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {prod.parent_id ? (
                        <span style={{ color: 'var(--text-muted)' }}>↳ {prod.variant_name} (de {products.find(p => p.id === prod.parent_id)?.name})</span>
                      ) : (
                        prod.name
                      )}
                      {prod.is_subscription && <span style={{ padding: '2px 6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Suscripción</span>}
                      {prod.is_service && !prod.is_subscription && <span style={{ padding: '2px 6px', background: 'rgba(59, 130, 246, 0.1)', color: '#10b981', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Servicio</span>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {prod.brand && <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>{prod.brand}</span>}
                      {prod.category ? (
                        <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '3px 8px', borderRadius: '4px', fontSize: '12px', width: 'fit-content' }}>
                          {prod.category}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td>${Number(prod.cost).toFixed(2)}</td>
                  <td>
                    {prod.target_margin > 0 ? (
                      <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                        {Number(prod.target_margin).toFixed(2)}%
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${Number(prod.price).toFixed(2)}</td>
                  <td>
                    <span style={{ color: prod.is_taxable ? '#4ade80' : 'var(--text-muted)', fontSize: '13px' }}>
                      {prod.is_taxable ? '13%' : 'Exento'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEdit(prod)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(prod.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'sticky', top: '-20px', paddingTop: '20px', background: 'rgba(15, 23, 42, 0.95)', backdropFilter: 'blur(12px)', zIndex: 10, paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h2 style={{ margin: 0 }}>{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Nombre del Artículo *</label>
                <input required type="text" className="glass-input" value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>SKU (Código Interno) *</label>
                  <input required type="text" className="glass-input" value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Código de Barras</label>
                  <input type="text" className="glass-input" value={formData.barcode} placeholder="Escanea o escribe aquí"
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Categoría</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="glass-input" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                      <option value="">Selecciona una categoría</option>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={handleAddCategory} className="glass-button" style={{ padding: '0 12px' }} title="Agregar nueva">
                      <Plus size={18} />
                    </button>
                    <button type="button" onClick={() => { setConfigType('category'); setShowConfigModal(true); }} className="glass-button" style={{ padding: '0 12px' }} title="Administrar">
                      <Settings size={18} />
                    </button>
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Marca</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select className="glass-input" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })}>
                      <option value="">Selecciona una marca</option>
                      {brands.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    <button type="button" onClick={handleAddBrand} className="glass-button" style={{ padding: '0 12px' }} title="Agregar nueva">
                      <Plus size={18} />
                    </button>
                    <button type="button" onClick={() => { setConfigType('brand'); setShowConfigModal(true); }} className="glass-button" style={{ padding: '0 12px' }} title="Administrar">
                      <Settings size={18} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Descripción</label>
                <input type="text" className="glass-input" value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              
              <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '12px', color: 'var(--primary)' }}>Variantes de Producto (Opcional)</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Si este producto es una talla o color de otro, selecciónalo como "Padre".
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Producto Padre</label>
                    <select className="glass-input" value={formData.parent_id || ''} onChange={e => {
                      const parentId = e.target.value || null;
                      const parent = products.find(p => p.id === parentId);
                      setFormData({ 
                        ...formData, 
                        parent_id: parentId,
                        name: parent ? parent.name : formData.name,
                        category: parent ? (parent.category || '') : formData.category,
                        brand: parent ? (parent.brand || '') : formData.brand,
                        description: parent ? (parent.description || '') : formData.description
                      });
                    }}>
                      <option value="">-- Ninguno (Es un producto principal) --</option>
                      {products.filter(p => !p.parent_id && p.id !== editingId).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {formData.parent_id && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Nombre de Variante *</label>
                      <input required type="text" className="glass-input" placeholder="Ej: Talla S, Color Rojo" value={formData.variant_name}
                        onChange={e => setFormData({ ...formData, variant_name: e.target.value })} />
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Costo (Desde Compras)</label>
                  <input type="number" step="0.01" className="glass-input" value={formData.cost} disabled 
                    style={{ opacity: 0.5, cursor: 'not-allowed' }} title="El costo se calcula automáticamente a partir de tus Compras" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Margen (%)</label>
                  <input type="number" step="0.01" className="glass-input" value={formData.target_margin}
                    onChange={e => handleMarginChange(e.target.value)} placeholder="Ej: 30" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Precio de Venta ($)</label>
                  <input required type="number" step="0.01" min="0" className="glass-input" value={formData.price}
                    onChange={e => handlePriceChange(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '8px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: 'var(--primary)' }}>Unidades por Caja</label>
                  <input type="number" min="1" className="glass-input" value={formData.units_per_box}
                    onChange={e => setFormData({ ...formData, units_per_box: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ color: 'var(--primary)' }}>Precio de Caja Mayorista ($)</label>
                  <input type="number" step="0.01" min="0" className="glass-input" value={formData.box_price}
                    onChange={e => setFormData({ ...formData, box_price: e.target.value })} placeholder="Opcional" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="is_taxable" checked={formData.is_taxable}
                    onChange={e => setFormData({ ...formData, is_taxable: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label htmlFor="is_taxable" style={{ cursor: 'pointer', marginBottom: 0 }}>
                    Aplica IVA 13%
                  </label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="is_service" checked={formData.is_service}
                    onChange={e => setFormData({ ...formData, is_service: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label htmlFor="is_service" style={{ cursor: 'pointer', marginBottom: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={14} color="var(--primary)"/> Es un Servicio (No inventario)
                  </label>
                </div>
              </div>

              {tenantInfo?.module_memberships !== false && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: formData.is_subscription ? '12px' : 0 }}>
                    <input type="checkbox" id="is_subscription" checked={formData.is_subscription}
                      onChange={e => setFormData({ ...formData, is_subscription: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <label htmlFor="is_subscription" style={{ cursor: 'pointer', marginBottom: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      Es una Suscripción / Membresía
                    </label>
                  </div>
                  {formData.is_subscription && (
                    <div className="form-group" style={{ marginBottom: 0, marginTop: '12px' }}>
                      <label>Duración en Días (Ej: 30 para mensual)</label>
                      <input type="number" min="1" className="glass-input" value={formData.subscription_days}
                        onChange={e => setFormData({ ...formData, subscription_days: e.target.value })} />
                    </div>
                  )}
                </div>
              )}
              
              <div style={{ background: 'rgba(168, 85, 247, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(168, 85, 247, 0.2)', marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <input type="checkbox" id="show_on_web" checked={formData.show_on_web}
                    onChange={e => setFormData({ ...formData, show_on_web: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label htmlFor="show_on_web" style={{ cursor: 'pointer', marginBottom: 0, color: '#a855f7', fontWeight: 600 }}>
                    Mostrar en Tienda Virtual
                  </label>
                </div>
                {formData.show_on_web && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Imagen del Producto</label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                      {formData.image_url ? (
                        <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                          <img src={formData.image_url} alt="Producto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, image_url: '' })}
                            style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <Package size={24} opacity={0.5} />
                        </div>
                      )}
                      
                      <div style={{ flex: 1 }}>
                        <label className="glass-button" style={{ display: 'inline-flex', cursor: uploadingImage ? 'not-allowed' : 'pointer', opacity: uploadingImage ? 0.7 : 1 }}>
                          {uploadingImage ? 'Subiendo...' : 'Subir Nueva Imagen'}
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploadingImage} />
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                          Recomendado: Formato cuadrado 1:1, PNG o JPG (Max 2MB).
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', justifyContent: 'center' }}
                  onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="glass-button" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Artículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)} style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '100%' }}>
            <h2>Administrar {configType === 'category' ? 'Categorías' : 'Marcas'}</h2>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginTop: '20px' }}>
              <table className="glass-table">
                <tbody>
                  {(configType === 'category' ? categories : brands).map(item => (
                    <tr key={item.id}>
                      {configType === 'category' && (
                        <td style={{ width: '60px' }}>
                          <label style={{ cursor: 'pointer', display: 'block', width: '40px', height: '40px', borderRadius: '8px', border: '1px dashed var(--border-color)', overflow: 'hidden', position: 'relative' }}>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                                <UploadCloud size={16} />
                              </div>
                            )}
                            {uploadingCatImage === item.id && (
                              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: 'white', fontSize: '10px' }}>...</span>
                              </div>
                            )}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleCategoryImageUpload(e, item.id)} disabled={uploadingCatImage === item.id} />
                          </label>
                        </td>
                      )}
                      <td>{item.name}</td>
                      <td style={{ width: '50px', textAlign: 'center' }}>
                        <button onClick={() => handleDeleteConfig(item.id, configType)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }} title="Eliminar">
                          <Trash size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(configType === 'category' ? categories : brands).length === 0 && (
                    <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay datos creados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="glass-button" onClick={() => setShowConfigModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catalogo;
