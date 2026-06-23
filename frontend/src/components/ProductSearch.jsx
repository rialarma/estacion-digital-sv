import React, { useState, useEffect, useRef } from 'react';
import { Search, Package } from 'lucide-react';

const ProductSearch = ({ products, onSelect, placeholder = "Buscar por nombre o SKU..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    // Cerrar si se hace clic fuera del componente
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFiltered([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const results = products.filter(p => 
      (p.name && p.name.toLowerCase().includes(term)) || 
      (p.sku && p.sku.toLowerCase().includes(term))
    ).slice(0, 20); // Limitar a 20 resultados para rendimiento

    setFiltered(results);
  }, [searchTerm, products]);

  const handleSelect = (product) => {
    onSelect(product);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      // Si presiona enter y hay resultados, selecciona el primero
      // Ideal para escáneres de código de barras que envían un "Enter" al final
      handleSelect(filtered[0]);
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="glass-input"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          style={{ paddingLeft: '40px', width: '100%' }}
          autoComplete="off"
        />
      </div>

      {showDropdown && searchTerm.trim() !== '' && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-dark)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          marginTop: '4px',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 50,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No se encontraron productos.
            </div>
          ) : (
            filtered.map(p => (
              <div 
                key={p.id}
                onClick={() => handleSelect(p)}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={14} color="var(--primary)" /> {p.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: '#10b981' }}>${Number(p.price).toFixed(2)}</div>
                  {p.stock !== undefined && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Disp: {p.stock}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
