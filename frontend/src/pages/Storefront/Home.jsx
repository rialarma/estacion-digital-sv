import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useCartStore } from './CartStore';
import { ShoppingCart, Plus, Minus, Trash2, Phone, Search, X, MessageCircle, Heart, User } from 'lucide-react';
import AuthStoreModal from './AuthStoreModal';
import './Storefront.css';

const StorefrontHome = ({ customTenantId }) => {
  const params = useParams();
  const tenantId = customTenantId || params.tenantId;
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenantName, setTenantName] = useState('Tienda Virtual');
  const [tenantConfig, setTenantConfig] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const { items, addItem, removeItem, updateQuantity, fetchCloudCart } = useCartStore();

  const cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = items.reduce((count, item) => count + item.quantity, 0);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        const { data: tenantData } = await supabase
          .rpc('get_storefront_config', { p_tenant_id: tenantId });
          
        if (tenantData) {
          setTenantName(tenantData.name);
          setTenantConfig(tenantData);
        }

        const { data: productsData, error } = await supabase
          .rpc('get_storefront_products', { p_tenant_id: tenantId });

        if (error) throw error;
        setProducts(productsData || []);

        const { data: catData } = await supabase
          .rpc('get_storefront_categories', { p_tenant_id: tenantId });
          
        if (catData) setCategories(catData);

        const { data: brandData } = await supabase
          .rpc('get_storefront_brands', { p_tenant_id: tenantId });
          
        if (brandData) setBrands(brandData);
      } catch (err) {
        console.error('Error fetching storefront:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) fetchStoreData();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
      if (session?.user && tenantId) {
        fetchCloudCart(tenantId);
      }
    });
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      if (session?.user && tenantId) {
        fetchCloudCart(tenantId);
      }
    });
    return () => subscription.unsubscribe();
  }, [tenantId]);

  const parentProducts = products.filter(p => !p.parent_id);
  
  const filteredProducts = parentProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getVariants = (parentId) => products.filter(p => p.parent_id === parentId);

  const handleOpenQuickView = (product) => {
    setSelectedProduct(product);
    const variants = getVariants(product.id);
    if (variants.length > 0) {
      setSelectedVariant(variants[0]);
    } else {
      setSelectedVariant(null);
    }
  };

  const handleAddToCart = (product, variant = null) => {
    const itemToAdd = variant || product;
    const isStockRestricted = !itemToAdd.is_service && !itemToAdd.is_subscription && tenantConfig?.allow_negative_stock === false;
    const currentStock = itemToAdd.stock || 0;
    
    const existing = items.find(i => i.id === itemToAdd.id);
    const currentQty = existing ? existing.quantity : 0;
    
    if (isStockRestricted && currentQty >= currentStock) {
      alert("No hay más stock disponible para este producto.");
      return;
    }

    if (variant) {
      addItem({ ...variant, name: `${product.name} - ${variant.variant_name}`, image_url: variant.image_url || product.image_url }, tenantId);
    } else {
      addItem(product, tenantId);
    }
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  if (loading) return <div className="storefront-loader">Cargando tienda...</div>;

  return (
    <div className="storefront-container">
      <style>{`
        .storefront-container {
          --sf-primary: ${tenantConfig?.primary_color || '#0f172a'};
          --sf-primary-hover: ${tenantConfig?.primary_color ? tenantConfig.primary_color + 'dd' : '#1e293b'};
          --sf-text-on-primary: ${tenantConfig?.store_primary_text_color || '#ffffff'};
        }
      `}</style>

      {tenantConfig?.store_promo_message && (
        <div style={{ background: 'var(--sf-primary)', color: 'var(--sf-text-on-primary)', textAlign: 'center', padding: '10px 16px', fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.5px' }}>
          {tenantConfig.store_promo_message}
        </div>
      )}

      <header className="storefront-header">
        <div className="storefront-header-content">
          <a href="#" className="sf-brand">
            {tenantConfig?.logo_url && (
              <img src={tenantConfig.logo_url} alt="Logo" className="sf-logo" />
            )}
            <h1 className="sf-title">{tenantName}</h1>
          </a>

          <div className="sf-search-container">
            <Search className="sf-search-icon" size={18} />
            <input 
              type="text" 
              className="sf-search-input" 
              placeholder="Buscar productos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="cart-toggle-btn" onClick={() => {
              if (currentUser) {
                navigate(customTenantId ? '/perfil' : `/tienda/${tenantId}/perfil`);
              } else {
                setIsAuthModalOpen(true);
              }
            }}>
              <User size={22} />
            </button>
            <button className="cart-toggle-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={22} />
              {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <section className="sf-hero">
        <img src={tenantConfig?.hero_banner_url || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"} alt="Promo" className="sf-hero-image" />
        <div className="sf-hero-overlay"></div>
        <div className="sf-hero-content">
          {tenantConfig?.store_slogan !== '' && <h2>{tenantConfig?.store_slogan ?? 'Todo tiene solución'}</h2>}
          {tenantConfig?.about_us !== '' && <p>{tenantConfig?.about_us ?? 'Encuentra las mejores marcas y herramientas al mejor precio, directo a tu casa u obra.'}</p>}
        </div>
      </section>

      <section className="sf-category-circles-container">
        <h3 className="sf-category-circles-title">Compra por categoría</h3>
        <div className="sf-category-circles">
          {categories.map(c => (
            <div key={c.id} className="sf-category-circle-item" onClick={() => { setSearchTerm(c.name); window.scrollTo({top: 600, behavior: 'smooth'}); }}>
              <div className="sf-category-circle">
                {c.image_url ? (
                  <img src={c.image_url} alt={c.name} />
                ) : (
                  <Search size={32} opacity={0.5} />
                )}
              </div>
              <span className="sf-category-circle-name">{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      <main className="storefront-main">
        <div className="sf-section-title">
          <span>Nuestro Catálogo</span>
          <span style={{ fontSize: '1rem', color: 'var(--sf-text-muted)', fontWeight: 'normal' }}>
            {filteredProducts.length} productos
          </span>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--sf-text-muted)' }}>
            <Search size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            <p>No se encontraron productos que coincidan con tu búsqueda.</p>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map(product => {
              const variants = getVariants(product.id);
              const hasVariants = variants.length > 0;
              
              return (
                <div key={product.id} className="product-card">
                  <div 
                    className="product-image-container" 
                    onClick={() => handleOpenQuickView(product)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Heart 
                      size={20} 
                      style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--sf-text-muted)', cursor: 'pointer', zIndex: 10, transition: 'color 0.2s' }} 
                      onMouseEnter={(e) => { e.stopPropagation(); e.target.style.color = 'var(--sf-accent)'; }}
                      onMouseLeave={(e) => e.target.style.color = 'var(--sf-text-muted)'}
                    />
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="product-image" />
                    ) : (
                      <div className="product-image-placeholder">Sin Imagen</div>
                    )}
                  </div>
                  <div className="product-info">
                    <span className="product-category">
                      {product.brand ? `${product.brand} ` : ''} 
                      {product.brand && product.category ? '• ' : ''}
                      {product.category || 'General'}
                    </span>
                    <h3 
                      className="product-name" 
                      onClick={() => handleOpenQuickView(product)}
                      style={{ cursor: 'pointer' }}
                    >
                      {product.name}
                    </h3>
                    {tenantConfig?.store_catalog_mode ? null : (
                      <div className="product-price">${Number(product.price).toFixed(2)} {hasVariants && <span style={{fontSize: '0.8rem', color: 'var(--sf-text-muted)', fontWeight: 'normal'}}>+</span>}</div>
                    )}
                    
                    {hasVariants ? (
                      <button 
                        className="add-to-cart-btn" style={{ background: 'var(--sf-surface)', color: 'var(--sf-primary)', border: '2px solid var(--sf-primary)' }}
                        onClick={() => handleOpenQuickView(product)}
                      >
                        VER OPCIONES
                      </button>
                    ) : (
                      (() => {
                        const isCatalog = tenantConfig?.store_catalog_mode === true;
                        const isStockRestricted = !product.is_service && !product.is_subscription && tenantConfig?.allow_negative_stock === false;
                        const isOutOfStock = !isCatalog && isStockRestricted && (product.stock || 0) <= 0;
                        
                        return isOutOfStock ? (
                          <button className="add-to-cart-btn" style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }} disabled>
                            AGOTADO
                          </button>
                        ) : (
                          <button 
                            className="add-to-cart-btn"
                            onClick={() => {
                              if (isCatalog) {
                                const msg = `Hola, me interesa el producto: ${product.name}. ¿Me podrían dar más información?`;
                                window.open(`https://wa.me/${tenantConfig?.whatsapp_number?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                              } else {
                                handleAddToCart(product);
                              }
                            }}
                          >
                            {tenantConfig?.store_button_text || 'AÑADIR AL CARRITO'}
                          </button>
                        );
                      })()
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedProduct && (
        <div className="cart-sidebar-overlay" onClick={() => setSelectedProduct(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div className="glass-panel" onClick={e => e.stopPropagation()} style={{ background: 'var(--sf-surface)', width: '90%', maxWidth: '500px', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
                <X size={18} />
              </button>
              <div style={{ width: '100%', height: '250px', background: '#f1f5f9' }}>
                {(selectedVariant?.image_url || selectedProduct.image_url) ? (
                  <img src={selectedVariant?.image_url || selectedProduct.image_url} alt={selectedProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="product-image-placeholder">Sin Imagen</div>
                )}
              </div>
            </div>
            
            <div style={{ padding: '24px' }}>
              <span className="product-category">{selectedProduct.brand ? `${selectedProduct.brand} • ` : ''}{selectedProduct.category || 'General'}</span>
              <h2 style={{ fontSize: '1.5rem', margin: '8px 0', color: 'var(--sf-text-main)' }}>{selectedProduct.name}</h2>
              <p style={{ color: 'var(--sf-text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>{selectedProduct.description}</p>
              
              {getVariants(selectedProduct.id).length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>Elige una opción:</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {getVariants(selectedProduct.id).map(variant => (
                      <button 
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: '8px', 
                          border: selectedVariant?.id === variant.id ? '2px solid var(--sf-primary)' : '1px solid var(--sf-border)',
                          background: selectedVariant?.id === variant.id ? 'var(--sf-surface)' : '#f8fafc',
                          fontWeight: selectedVariant?.id === variant.id ? 600 : 400,
                          cursor: 'pointer',
                          color: 'var(--sf-text-main)'
                        }}
                      >
                        {variant.variant_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {tenantConfig?.store_catalog_mode ? '' : `$${Number(selectedVariant ? selectedVariant.price : selectedProduct.price).toFixed(2)}`}
                </div>
                {(() => {
                  const targetItem = selectedVariant || selectedProduct;
                  const isCatalog = tenantConfig?.store_catalog_mode === true;
                  const isStockRestricted = !targetItem.is_service && !targetItem.is_subscription && tenantConfig?.allow_negative_stock === false;
                  const isOutOfStock = !isCatalog && isStockRestricted && (targetItem.stock || 0) <= 0;
                  
                  return isOutOfStock ? (
                    <button className="add-to-cart-btn" style={{ width: 'auto', padding: '12px 24px', background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }} disabled>
                      AGOTADO
                    </button>
                  ) : (
                    <button 
                      className="add-to-cart-btn" 
                      style={{ width: 'auto', padding: '12px 24px' }}
                      onClick={() => {
                        if (isCatalog) {
                          const msg = `Hola, me interesa el producto: ${targetItem.name}. ¿Me podrían dar más información?`;
                          window.open(`https://wa.me/${tenantConfig?.whatsapp_number?.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
                        } else {
                          handleAddToCart(selectedProduct, selectedVariant);
                        }
                      }}
                    >
                      {tenantConfig?.store_button_text || 'AÑADIR AL CARRITO'}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCartOpen && (
        <div className="cart-sidebar-overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Tu Carrito</h2>
              <button className="close-cart-btn" onClick={() => setIsCartOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="cart-items">
              {items.length === 0 ? (
                <p className="cart-empty-text">Tu carrito está vacío.</p>
              ) : (
                items.map(item => {
                  const originalProduct = products.find(p => p.id === item.id) || {};
                  const isStockRestricted = !originalProduct.is_service && !originalProduct.is_subscription && tenantConfig?.allow_negative_stock === false;
                  const isMaxReached = isStockRestricted && item.quantity >= (originalProduct.stock || 0);

                  return (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <h4>{item.name}</h4>
                        <p>${Number(item.price).toFixed(2)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1), tenantId)}><Minus size={14} /></button>
                        <span style={{ fontWeight: 600, width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                        <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1, tenantId)} disabled={isMaxReached} style={{ opacity: isMaxReached ? 0.3 : 1, cursor: isMaxReached ? 'not-allowed' : 'pointer' }}><Plus size={14} /></button>
                      </div>
                      <button className="cart-remove-btn" onClick={() => removeItem(item.id, tenantId)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span>Total:</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                <button className="checkout-btn" onClick={() => navigate(customTenantId ? '/checkout' : `/tienda/${tenantId}/checkout`)}>
                  Ir a Pagar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <section className="sf-features-strip">
        <div className="sf-features-content">
          <div className="sf-feature-item">
            <div className="sf-feature-icon">🚚</div>
            <h4 className="sf-feature-title">Envío a domicilio</h4>
            <p className="sf-feature-desc">Entrega rápida en tus pedidos</p>
          </div>
          <div className="sf-feature-item">
            <div className="sf-feature-icon">⏱️</div>
            <h4 className="sf-feature-title">Retiro en Tienda</h4>
            <p className="sf-feature-desc">Compra online, recoge hoy mismo</p>
          </div>
          <div className="sf-feature-item">
            <div className="sf-feature-icon">💳</div>
            <h4 className="sf-feature-title">Múltiples Pagos</h4>
            <p className="sf-feature-desc">Efectivo, Tarjetas o Transferencia</p>
          </div>
          <div className="sf-feature-item">
            <div className="sf-feature-icon">🛡️</div>
            <h4 className="sf-feature-title">Garantía Segura</h4>
            <p className="sf-feature-desc">Productos 100% garantizados</p>
          </div>
        </div>
      </section>

      {brands && brands.length > 0 && (
        <section className="sf-brands-strip">
          <h3 className="sf-brands-title">Conoce nuestras marcas</h3>
          <div className="sf-brands-content">
            {brands.slice(0, 6).map(b => (
              <div key={b.id} className="sf-brand-logo-placeholder">{b.name}</div>
            ))}
          </div>
        </section>
      )}

      <footer className="sf-footer">
        <div className="sf-footer-content">
          <div className="sf-footer-brand">
            <h4>{tenantName}</h4>
            <p>{tenantConfig?.about_us || 'Tu mejor opción en línea. Calidad y servicio hasta la puerta de tu casa.'}</p>
            
            <div style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.9)', fontSize: '0.95rem' }}>
              <p style={{ margin: '4px 0' }}>SÍGUENOS EN NUESTRAS REDES</p>
            </div>

            <div className="sf-footer-socials">
              {tenantConfig?.facebook_url && (
                <a href={tenantConfig.facebook_url} target="_blank" rel="noopener noreferrer" className="sf-social-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
              )}
              {tenantConfig?.instagram_url && (
                <a href={tenantConfig.instagram_url} target="_blank" rel="noopener noreferrer" className="sf-social-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
              )}
              {tenantConfig?.tiktok_url && (
                <a href={tenantConfig.tiktok_url} target="_blank" rel="noopener noreferrer" className="sf-social-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                </a>
              )}
              {tenantConfig?.whatsapp_number && (
                <a href={`https://wa.me/${tenantConfig.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="sf-social-icon">
                  <MessageCircle size={18} />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="sf-footer-bottom">
          <p>&copy; {new Date().getFullYear()} {tenantName}. Todos los derechos reservados.</p>
        </div>
      </footer>

      {tenantConfig?.whatsapp_number && tenantConfig?.store_show_whatsapp_float !== false && (
        <a 
          href={`https://wa.me/${tenantConfig.whatsapp_number.replace(/\D/g, '')}?text=Hola,%20quisiera%20más%20información.`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="sf-whatsapp-float"
          aria-label="Contactar por WhatsApp"
        >
          <MessageCircle size={28} />
        </a>
      )}

    </div>
  );
};

export default StorefrontHome;
