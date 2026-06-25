import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useCartStore } from './CartStore';
import { ShoppingCart, Plus, Minus, Trash2, Phone, Search, X, MessageCircle } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const { items, addItem, removeItem, updateQuantity } = useCartStore();

  const cartTotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const cartItemCount = items.reduce((count, item) => count + item.quantity, 0);

  useEffect(() => {
    const fetchStoreData = async () => {
      try {
        // Fetch Tenant Name (Optional, might require RLS adjustment if not public, 
        // but let's try reading public.tenants if possible, or just default)
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('name, logo_url, whatsapp_number, facebook_url, instagram_url, about_us, allow_negative_stock, primary_color, hero_banner_url, store_slogan')
          .eq('id', tenantId)
          .single();
          
        if (tenantData) {
          setTenantName(tenantData.name);
          setTenantConfig(tenantData);
        }

        // Fetch Products via RPC
        const { data: productsData, error } = await supabase
          .rpc('get_storefront_products', { p_tenant_id: tenantId });

        if (error) throw error;
        setProducts(productsData || []);

        // Fetch Categories
        const { data: catData } = await supabase
          .from('product_categories')
          .select('id, name, image_url')
          .eq('tenant_id', tenantId)
          .order('name');
          
        if (catData) setCategories(catData);

        // Fetch Brands
        const { data: brandData } = await supabase
          .from('product_brands')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .order('name');
          
        if (brandData) setBrands(brandData);
      } catch (err) {
        console.error('Error fetching storefront:', err);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) fetchStoreData();
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
      setSelectedVariant(variants[0]); // Select first variant by default
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
      addItem({ ...variant, name: `${product.name} - ${variant.variant_name}`, image_url: variant.image_url || product.image_url });
    } else {
      addItem(product);
    }
    setSelectedProduct(null); // Close modal if open
    setIsCartOpen(true);
  };

  if (loading) return <div className="storefront-loader">Cargando tienda...</div>;

  return (
    <div className="storefront-container">
      <style>{`
        .storefront-container {
          --sf-primary: ${tenantConfig?.primary_color || '#0f172a'};
          --sf-primary-hover: ${tenantConfig?.primary_color ? tenantConfig.primary_color + 'dd' : '#1e293b'};
        }
      `}</style>

      {/* Header Fijo */}
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

          <button className="cart-toggle-btn" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart size={22} />
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </button>
        </div>
      </header>

      {/* Navbar con Mega Menu */}
      <nav className="sf-navbar">
        <div className="sf-navbar-content">
          <div className="sf-nav-item">
            ☰ Departamentos
            <div className="sf-mega-menu">
              {categories.map(c => (
                <div key={c.id} className="sf-mega-menu-item" onClick={() => { setSearchTerm(c.name); window.scrollTo({top: 500, behavior: 'smooth'}); }}>
                  {c.name}
                </div>
              ))}
              {categories.length === 0 && <div className="sf-mega-menu-item" style={{ color: 'var(--sf-text-muted)' }}>No hay categorías</div>}
            </div>
          </div>
          <div className="sf-nav-item">Promociones</div>
          <div className="sf-nav-item">Nuestras Marcas</div>
          <div className="sf-nav-item">Ideas y Soluciones</div>
        </div>
      </nav>

      {/* Hero Banner Dinámico (Carrusel) */}
      <section className="sf-hero">
        <img src={tenantConfig?.hero_banner_url || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"} alt="Promo" className="sf-hero-image" />
        <div className="sf-hero-overlay"></div>
        <div className="sf-hero-content">
          {tenantConfig?.store_slogan !== '' && <h2>{tenantConfig?.store_slogan ?? 'Todo tiene solución'}</h2>}
          {tenantConfig?.about_us !== '' && <p>{tenantConfig?.about_us ?? 'Encuentra las mejores marcas y herramientas al mejor precio, directo a tu casa u obra.'}</p>}
        </div>
      </section>

      {/* Círculos de Compra por Categoría */}
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

      {/* Catálogo */}
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
                  <div className="product-image-container">
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
                    <h3 className="product-name">{product.name}</h3>
                    <div className="product-price">${Number(product.price).toFixed(2)} {hasVariants && <span style={{fontSize: '0.8rem', color: 'var(--sf-text-muted)', fontWeight: 'normal'}}>+</span>}</div>
                    
                    {hasVariants ? (
                      <button 
                        className="add-to-cart-btn" style={{ background: 'var(--sf-surface)', color: 'var(--sf-primary)', border: '1px solid var(--sf-primary)' }}
                        onClick={() => handleOpenQuickView(product)}
                      >
                        Ver Opciones
                      </button>
                    ) : (
                      (() => {
                        const isStockRestricted = !product.is_service && !product.is_subscription && tenantConfig?.allow_negative_stock === false;
                        const isOutOfStock = isStockRestricted && (product.stock || 0) <= 0;
                        return isOutOfStock ? (
                          <button className="add-to-cart-btn" style={{ background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }} disabled>
                            Agotado
                          </button>
                        ) : (
                          <button 
                            className="add-to-cart-btn"
                            onClick={() => handleAddToCart(product)}
                          >
                            <Plus size={18} /> Agregar al Carrito
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

      {/* Modal de Producto (Vista Rápida) para Variantes */}
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

              <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                  ${Number(selectedVariant ? selectedVariant.price : selectedProduct.price).toFixed(2)}
                </div>
                {(() => {
                  const targetItem = selectedVariant || selectedProduct;
                  const isStockRestricted = !targetItem.is_service && !targetItem.is_subscription && tenantConfig?.allow_negative_stock === false;
                  const isOutOfStock = isStockRestricted && (targetItem.stock || 0) <= 0;
                  
                  return isOutOfStock ? (
                    <button className="add-to-cart-btn" style={{ width: 'auto', padding: '12px 24px', background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed' }} disabled>
                      Agotado
                    </button>
                  ) : (
                    <button 
                      className="add-to-cart-btn" 
                      style={{ width: 'auto', padding: '12px 24px' }}
                      onClick={() => handleAddToCart(selectedProduct, selectedVariant)}
                    >
                      Agregar al Carrito
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Modal */}
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
                      <div className="cart-item-actions">
                        <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}><Minus size={16} /></button>
                        <span>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={isMaxReached}
                          style={{ opacity: isMaxReached ? 0.3 : 1, cursor: isMaxReached ? 'not-allowed' : 'pointer' }}
                        ><Plus size={16} /></button>
                        <button className="remove-item-btn" onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                      </div>
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

      {/* Bandeja de Beneficios (Features Strip) */}
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

      {/* Marcas (Brands Strip) */}
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

      {/* Footer Pro */}
      <footer className="sf-footer">
        <div className="sf-footer-content">
          <div className="sf-footer-col sf-footer-brand">
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white', margin: 0 }}>{tenantName}</h3>
            <p>{tenantConfig?.about_us || 'Tu mejor opción en línea. Calidad y servicio hasta la puerta de tu casa.'}</p>
            <div className="sf-footer-socials">
              {tenantConfig?.facebook_url && <a href={tenantConfig.facebook_url} target="_blank" rel="noopener noreferrer" className="sf-social-icon">Facebook</a>}
              {tenantConfig?.instagram_url && <a href={tenantConfig.instagram_url} target="_blank" rel="noopener noreferrer" className="sf-social-icon">Instagram</a>}
            </div>
          </div>
          
          <div className="sf-footer-col">
            <h4>Servicio al cliente</h4>
            <ul className="sf-footer-links">
              <li><a href="#">Contáctenos</a></li>
              <li><a href="#">Términos y Condiciones</a></li>
              <li><a href="#">Preguntas frecuentes</a></li>
              <li><a href="#">¿Cómo comprar en línea?</a></li>
            </ul>
          </div>

          <div className="sf-footer-col">
            <h4>Nuestra empresa</h4>
            <ul className="sf-footer-links">
              <li><a href="#">Servicios</a></li>
              <li><a href="#">Acerca de nosotros</a></li>
              <li><a href="#">Tiendas físicas</a></li>
              <li><a href="#">Políticas de devolución</a></li>
            </ul>
          </div>
          
          <div className="sf-footer-col">
            <h4>Contacto directo</h4>
            <ul className="sf-footer-links">
              {tenantConfig?.whatsapp_number && (
                <li>
                  <a href={`https://wa.me/${tenantConfig.whatsapp_number.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                    <Phone size={16} /> WhatsApp: {tenantConfig.whatsapp_number}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="sf-footer-bottom">
          <p>© {new Date().getFullYear()} {tenantName}. NIT: 0000-000000-000-0. Todos los derechos reservados.</p>
          <div className="sf-footer-payments">
            <span>Visa</span> | <span>Mastercard</span> | <span>Bitcoin</span>
          </div>
        </div>
      </footer>
      {/* Floating WhatsApp Button */}
      {tenantConfig?.whatsapp_number && (
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
