import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Package, X, UploadCloud, DownloadCloud } from 'lucide-react';
import { supabase } from '../supabase';

const Catalogo = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', sku: '', description: '', category: '',
    price: '', cost: '', target_margin: '', is_taxable: true,
    units_per_box: 1, box_price: '', is_service: false
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: '', sku: '', description: '', category: '', price: '', cost: '', target_margin: '', is_taxable: true, units_per_box: 1, box_price: '', is_service: false });
    setShowModal(true);
  };

  const openEdit = (prod) => {
    setEditingId(prod.id);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      description: prod.description || '',
      category: prod.category || '',
      price: prod.price,
      cost: prod.cost,
      target_margin: prod.target_margin || '',
      is_taxable: prod.is_taxable,
      units_per_box: prod.units_per_box || 1,
      box_price: prod.box_price || prod.price,
      is_service: prod.is_service || false,
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
    }
    setFormData({ ...formData, price: val, target_margin: m });
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
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        cost: parseFloat(formData.cost) || 0,
        target_margin: parseFloat(formData.target_margin) || 0,
        is_taxable: formData.is_taxable,
        units_per_box: parseInt(formData.units_per_box) || 1,
        box_price: parseFloat(formData.box_price) || parseFloat(formData.price) || 0,
        is_service: formData.is_service,
      };

      if (editingId) {
        const { error } = await supabase.from('products').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        // Insertar producto
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert([{ ...payload, tenant_id: profile.tenant_id }])
          .select()
          .single();
        if (insertError) throw insertError;

        // Crear entrada de inventario en 0 para la sucursal principal (solo si NO es servicio)
        if (profile.branch_id && !payload.is_service) {
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
    const headers = "SKU,Nombre,Descripcion,Categoria,Precio,Costo,EsGravado\n";
    const example = "PROD-001,Laptop HP,Laptop empresarial,Tecnologia,1000.00,800.00,SI\n";
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
          
          let margin = 0;
          if (cost > 0) margin = (((price / cost) - 1) * 100).toFixed(2);

          const { data: newProd, error: insertError } = await supabase.from('products').insert([{
            tenant_id: profile.tenant_id,
            sku, name, description: desc, category: cat, price, cost, target_margin: margin, is_taxable: isTaxable
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
            placeholder="Buscar por nombre, SKU o categoría..."
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
                <th>Categoría</th>
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
                  <td style={{ fontFamily: 'monospace', fontSize: '13px', color: 'var(--text-muted)' }}>{prod.sku}</td>
                  <td style={{ fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {prod.name}
                      {prod.is_service && <span style={{ padding: '2px 6px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Servicio</span>}
                    </div>
                  </td>
                  <td>
                    {prod.category ? (
                      <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '3px 8px', borderRadius: '4px', fontSize: '12px' }}>
                        {prod.category}
                      </span>
                    ) : '—'}
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
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2>{editingId ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Nombre del Artículo *</label>
                  <input required type="text" className="glass-input" value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>SKU *</label>
                  <input required type="text" className="glass-input" value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Categoría</label>
                  <input type="text" className="glass-input" placeholder="Ej: Electrónica" value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Descripción</label>
                  <input type="text" className="glass-input" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Costo (Desde Compras)</label>
                  <input type="number" step="0.01" className="glass-input" value={formData.cost} disabled 
                    style={{ opacity: 0.5, cursor: 'not-allowed' }} />
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
                    <Package size={14} color="var(--primary)"/> Es un Servicio (No lleva inventario)
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
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
    </div>
  );
};

export default Catalogo;
