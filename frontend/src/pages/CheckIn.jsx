import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, UserCheck, UserX, User } from 'lucide-react';

const CheckIn = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [loading, setLoading] = useState(false);

  // Búsqueda en tiempo real (debounced manual o automático)
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*, client_subscriptions(*, products(name))')
      .or(`name.ilike.%${searchQuery}%,document_number.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .limit(10);
    
    if (!error && data) {
      setSearchResults(data);
    }
    setLoading(false);
  };

  const handleSelect = (client) => {
    setSelectedClient(client);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Determinar el estado general del cliente seleccionado
  let status = 'NO_SUBSCRIPTION';
  let activeSubs = [];
  let expiredSubs = [];

  if (selectedClient && selectedClient.client_subscriptions) {
    const today = new Date();
    today.setHours(0,0,0,0);

    activeSubs = selectedClient.client_subscriptions.filter(sub => new Date(sub.end_date) >= today);
    expiredSubs = selectedClient.client_subscriptions.filter(sub => new Date(sub.end_date) < today);

    if (activeSubs.length > 0) {
      status = 'ACTIVE';
    } else if (expiredSubs.length > 0) {
      status = 'EXPIRED';
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Control de Acceso / Check-In</h1>
        <p style={{ color: 'var(--text-muted)' }}>Busca al cliente por nombre, teléfono o DUI para verificar su membresía.</p>
      </div>

      <div className="glass-panel" style={{ padding: '24px', position: 'relative', zIndex: 10 }}>
        <div style={{ position: 'relative' }}>
          <Search size={24} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--primary)' }} />
          <input
            type="text"
            className="glass-input"
            style={{ paddingLeft: '50px', fontSize: '18px', height: '56px' }}
            placeholder="Buscar cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {loading && <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-muted)' }}>Buscando...</div>}

        {searchResults.length > 0 && (
          <div style={{ 
            position: 'absolute', top: '100%', left: 0, right: 0, 
            background: 'var(--bg-card)', border: '1px solid var(--border-color)', 
            borderRadius: '12px', marginTop: '8px', overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            {searchResults.map(client => (
              <div 
                key={client.id}
                onClick={() => handleSelect(client)}
                style={{ 
                  padding: '16px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '16px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ background: 'var(--bg-app)', padding: '10px', borderRadius: '50%' }}>
                  <User size={20} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{client.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {client.document_number && `Doc: ${client.document_number} | `}
                    {client.phone && `Tel: ${client.phone}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClient && (
        <div className="glass-panel" style={{ marginTop: '24px', padding: '40px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '100px', height: '100px', borderRadius: '50%', marginBottom: '20px',
            background: status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : status === 'EXPIRED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(107, 114, 128, 0.2)',
            color: status === 'ACTIVE' ? '#10b981' : status === 'EXPIRED' ? '#ef4444' : '#6b7280'
          }}>
            {status === 'ACTIVE' ? <UserCheck size={50} /> : status === 'EXPIRED' ? <UserX size={50} /> : <User size={50} />}
          </div>

          <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>{selectedClient.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginBottom: '24px' }}>
            {selectedClient.document_number || 'Sin Documento'}
          </p>

          <div style={{ 
            padding: '16px', borderRadius: '12px', 
            background: status === 'ACTIVE' ? '#10b981' : status === 'EXPIRED' ? '#ef4444' : 'var(--bg-app)',
            color: status === 'ACTIVE' || status === 'EXPIRED' ? '#fff' : 'var(--text-main)',
            fontSize: '24px', fontWeight: 'bold', display: 'inline-block', marginBottom: '32px',
            minWidth: '200px'
          }}>
            {status === 'ACTIVE' && '¡ACCESO CONCEDIDO!'}
            {status === 'EXPIRED' && 'MEMBRESÍA VENCIDA'}
            {status === 'NO_SUBSCRIPTION' && 'SIN MEMBRESÍA'}
          </div>

          <div style={{ textAlign: 'left', background: 'var(--bg-app)', padding: '24px', borderRadius: '12px' }}>
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Historial de Suscripciones</h3>
            
            {activeSubs.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#10b981', marginBottom: '8px' }}>Activas:</h4>
                {activeSubs.map(sub => (
                  <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', marginBottom: '8px' }}>
                    <strong>{sub.products?.name}</strong>
                    <span>Vence el: {new Date(sub.end_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {expiredSubs.length > 0 && (
              <div>
                <h4 style={{ color: '#ef4444', marginBottom: '8px' }}>Vencidas:</h4>
                {expiredSubs.map(sub => (
                  <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{sub.products?.name}</span>
                    <span style={{ color: '#ef4444' }}>Venció el: {new Date(sub.end_date).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            {activeSubs.length === 0 && expiredSubs.length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>El cliente nunca ha tenido una membresía registrada.</p>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
};

export default CheckIn;
