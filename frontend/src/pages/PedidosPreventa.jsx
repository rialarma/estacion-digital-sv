import React, { useState, useEffect } from 'react';
import { ShoppingCart, ExternalLink, ShoppingBag } from 'lucide-react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';

const PedidosPreventa = () => {
  const { tenantInfo } = useTenantStore();
  const navigate = useNavigate();
  
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    const { data } = await supabase
      .from('quotes')
      .select('*, clients(name), seller:user_profiles!quotes_seller_id_fkey(first_name, last_name)')
      .eq('status', 'PENDING_PEDIDO')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setQuotes(data);
  };

  return (
    <div className="page-container fade-in">
      <PageHeader title="Pedidos Preventa" icon={ShoppingBag}>
        <div className="header-title">
          <ShoppingCart size={32} color="var(--primary)" />
          <div>
            
            <p style={{ color: 'var(--text-muted)' }}>Ventas generadas en calle pendientes de facturar.</p>
          </div>
        </div>
      </PageHeader>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Pedidos Pendientes</h2>
        
        <div className="table-responsive">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Válido Hasta</th>
                <th>Total</th>
                <th style={{ textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id}>
                  <td>{new Date(q.created_at).toLocaleDateString()}</td>
                  <td>{q.clients?.name || 'Consumidor Final'}</td>
                  <td>{q.seller?.first_name} {q.seller?.last_name}</td>
                  <td>{new Date(q.valid_until).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 'bold', color: '#10b981' }}>${Number(q.total).toFixed(2)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="glass-button" 
                      style={{ padding: '6px 12px', fontSize: '13px', background: '#10b981', display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
                      onClick={() => navigate(`/ventas?quote=${q.id}`)}
                    >
                      <ExternalLink size={14} style={{ marginRight: '6px' }} />
                      Facturar
                    </button>
                  </td>
                </tr>
              ))}
              {quotes.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No hay pedidos pendientes de preventa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PedidosPreventa;
