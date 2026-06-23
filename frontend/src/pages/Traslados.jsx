import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import { useAuth } from '../hooks/useAuth';
import { ArrowRightLeft, Search, Plus, Save } from 'lucide-react';

const Traslados = () => {
  const { tenantId } = useTenantStore();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [branches, setBranches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedToBranch, setSelectedToBranch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [transferItems, setTransferItems] = useState([]);

  useEffect(() => {
    fetchData();
  }, [tenantId, user]);

  const fetchData = async () => {
    if (!tenantId || !user) return;
    setLoading(true);

    const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', user.id).single();
    setProfile(prof);

    if (prof?.branch_id) {
      // Get all branches except current
      const { data: bData } = await supabase.from('branches').select('*').eq('tenant_id', tenantId).neq('id', prof.branch_id);
      if (bData) setBranches(bData);

      // Get current inventory for this branch
      const { data: invData } = await supabase
        .from('inventory')
        .select('id, stock, products(id, name, sku)')
        .eq('branch_id', prof.branch_id)
        .gt('stock', 0);
        
      if (invData) setInventory(invData);
    }
    
    setLoading(false);
  };

  const handleAdd = () => {
    if (!selectedProductId || quantity <= 0) return;
    const invItem = inventory.find(i => i.products.id === selectedProductId);
    if (!invItem) return;

    if (quantity > invItem.stock) {
      alert(`No puedes trasladar más del stock actual (${invItem.stock})`);
      return;
    }

    const existing = transferItems.find(i => i.product_id === selectedProductId);
    if (existing) {
      const totalQuant = existing.quantity + quantity;
      if (totalQuant > invItem.stock) {
        alert("La cantidad sumada supera el stock disponible.");
        return;
      }
      setTransferItems(transferItems.map(i => i.product_id === selectedProductId ? { ...i, quantity: totalQuant } : i));
    } else {
      setTransferItems([...transferItems, {
        product_id: selectedProductId,
        name: invItem.products.name,
        sku: invItem.products.sku,
        quantity: quantity,
        current_stock: invItem.stock
      }]);
    }

    setSelectedProductId('');
    setQuantity(1);
  };

  const executeTransfer = async () => {
    if (transferItems.length === 0 || !selectedToBranch) return;
    setSaving(true);

    try {
      const fromBranch = profile.branch_id;
      const toBranch = selectedToBranch;

      // 1. Create Transfer Record
      const { data: transfer, error: transferError } = await supabase.from('inventory_transfers').insert([{
        tenant_id: tenantId,
        from_branch_id: fromBranch,
        to_branch_id: toBranch,
        status: 'COMPLETED',
        created_by: user.id
      }]).select().single();

      if (transferError) throw transferError;

      for (const item of transferItems) {
        // Log Transfer Item
        await supabase.from('inventory_transfer_items').insert([{
          transfer_id: transfer.id,
          product_id: item.product_id,
          quantity: item.quantity
        }]);

        // Reduce stock in FROM branch
        const { data: fromInv } = await supabase.from('inventory').select('id, stock').eq('branch_id', fromBranch).eq('product_id', item.product_id).single();
        const newFromStock = fromInv.stock - item.quantity;
        await supabase.from('inventory').update({ stock: newFromStock }).eq('id', fromInv.id);

        // Movement Log OUT
        await supabase.from('inventory_movements').insert([{
          tenant_id: tenantId, branch_id: fromBranch, product_id: item.product_id,
          movement_type: 'TRANSFER', quantity: item.quantity, previous_stock: fromInv.stock, new_stock: newFromStock,
          reference_id: transfer.id, description: 'Traslado enviado', created_by: user.id
        }]);

        // Increase/Create stock in TO branch
        const { data: toInv } = await supabase.from('inventory').select('id, stock').eq('branch_id', toBranch).eq('product_id', item.product_id).single();
        if (toInv) {
          const newToStock = toInv.stock + item.quantity;
          await supabase.from('inventory').update({ stock: newToStock }).eq('id', toInv.id);
          
          // Movement Log IN
          await supabase.from('inventory_movements').insert([{
            tenant_id: tenantId, branch_id: toBranch, product_id: item.product_id,
            movement_type: 'TRANSFER', quantity: item.quantity, previous_stock: toInv.stock, new_stock: newToStock,
            reference_id: transfer.id, description: 'Traslado recibido', created_by: user.id
          }]);
        } else {
          await supabase.from('inventory').insert([{
            tenant_id: tenantId, branch_id: toBranch, product_id: item.product_id, stock: item.quantity
          }]);

          await supabase.from('inventory_movements').insert([{
            tenant_id: tenantId, branch_id: toBranch, product_id: item.product_id,
            movement_type: 'TRANSFER', quantity: item.quantity, previous_stock: 0, new_stock: item.quantity,
            reference_id: transfer.id, description: 'Traslado recibido (Nuevo)', created_by: user.id
          }]);
        }
      }

      alert("Traslado ejecutado con éxito.");
      setTransferItems([]);
      setSelectedToBranch('');
      fetchData();
    } catch (err) {
      alert("Error en el traslado: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando inventario...</div>;
  if (!profile?.branch_id) return <div style={{ padding: '40px', textAlign: 'center' }}>Debes estar asignado a una sucursal para hacer traslados.</div>;

  return (
    <div className="page-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="page-header" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <ArrowRightLeft size={32} color="var(--primary)" />
        <h1 className="page-title">Traslados de Inventario</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Construir Traslado</h2>
          
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <select className="glass-input" style={{ flex: 2 }} value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
              <option value="">Selecciona un producto de tu sucursal...</option>
              {inventory.map(inv => (
                <option key={inv.products.id} value={inv.products.id}>
                  {inv.products.sku} - {inv.products.name} (Disp: {inv.stock})
                </option>
              ))}
            </select>
            <input 
              type="number" min="1" className="glass-input" style={{ flex: 1 }} 
              value={quantity} onChange={e => setQuantity(Number(e.target.value))} 
            />
            <button className="glass-button" onClick={handleAdd}><Plus size={18} /> Agregar</button>
          </div>

          <table className="glass-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Cant. a Mover</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {transferItems.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Agrega productos para trasladar</td></tr>
              ) : (
                transferItems.map(item => (
                  <tr key={item.product_id}>
                    <td>{item.sku}</td>
                    <td>{item.name}</td>
                    <td style={{ fontWeight: 'bold' }}>{item.quantity}</td>
                    <td>
                      <button onClick={() => setTransferItems(transferItems.filter(i => i.product_id !== item.product_id))} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>Quitar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Destino</h2>
          
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Enviar a Sucursal:</label>
            <select className="glass-input" value={selectedToBranch} onChange={e => setSelectedToBranch(e.target.value)}>
              <option value="">Seleccione destino...</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <button 
            className="glass-button" 
            style={{ width: '100%', background: '#3b82f6', display: 'flex', justifyContent: 'center', gap: '8px' }} 
            onClick={executeTransfer} 
            disabled={saving || transferItems.length === 0 || !selectedToBranch}
          >
            <Save size={18} /> {saving ? 'Ejecutando...' : 'Confirmar Traslado'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Traslados;
