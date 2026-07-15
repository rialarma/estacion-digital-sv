import React, { useState, useEffect } from 'react';
import { ShoppingCart, Save, Lock, Monitor, Plus, Info } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useTenantStore } from '../store/useTenantStore';
import ProductSearch from '../components/ProductSearch';
import CameraScanner from '../components/CameraScanner';
import { printDocument } from '../utils/printUtils';

// Genera un UUID v4 simple para el código de generación del DTE
const generarCodigoGeneracion = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16).toUpperCase();
  });
};

const Ventas = () => {
  const { tenantInfo } = useTenantStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedSellerId, setSelectedSellerId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  
  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);

  useEffect(() => {
    fetchActiveShift();
    fetchProducts();
    fetchClients();
    fetchSellers();
    fetchDrivers();
  }, []);

  useEffect(() => {
    // If products are loaded and there's a quote ID in URL, load it
    const quoteId = searchParams.get('quote');
    if (quoteId && products.length > 0) {
      loadQuote(quoteId);
    }
  }, [searchParams, products]);

  const loadQuote = async (quoteId) => {
    setLoading(true);
    try {
      const { data: quote } = await supabase.from('quotes').select('*').eq('id', quoteId).single();
      if (quote) {
        setSelectedClientId(quote.client_id || '');
        setSelectedSellerId(quote.seller_id || '');
        
        const { data: qItems } = await supabase.from('quote_items').select('*').eq('quote_id', quoteId);
        if (qItems && qItems.length > 0) {
          const newItems = qItems.map(qi => {
            const prod = products.find(p => p.id === qi.product_id);
            return {
              id: qi.product_id,
              name: prod ? prod.name : 'Producto Eliminado',
              price: qi.unit_price,
              cost: prod ? prod.cost : 0,
              quantity: qi.quantity,
              total: qi.subtotal
            };
          });
          setItems(newItems);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchActiveShift = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return;
    
    const { data: shift } = await supabase
      .from('cash_shifts')
      .select('id')
      .eq('cashier_id', userData.user.id)
      .eq('status', 'OPEN')
      .single();
      
    setActiveShift(shift);
  };

  const fetchSellers = async () => {
    const { data } = await supabase.from('user_profiles').select('*').order('first_name');
    if (data) setSellers(data);

    // Autoseleccionar al usuario actual como vendedor por defecto
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setSelectedSellerId(userData.user.id);
    }
  };

  const fetchDrivers = async () => {
    const { data } = await supabase.from('drivers').select('*').order('name');
    if (data) setDrivers(data);
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    if (data) {
      setClients(data);
      const genericClient = data.find(c => c.name === 'Consumidor Final' && (c.document_number === '00000000-0' || c.document_number === '000000000-0'));
      if (genericClient && !selectedClientId) {
        setSelectedClientId(genericClient.id);
      }
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data: prodData, error } = await supabase
      .from('products')
      .select('id, name, price, cost, sku, barcode, units_per_box, box_price, is_service, is_subscription, subscription_days');
      
    const { data: invData } = await supabase.from('inventory').select('product_id, stock');

    if (!error && prodData) {
      const merged = prodData.map(p => {
        const inv = invData?.find(i => i.product_id === p.id);
        return { ...p, stock: inv ? inv.stock : 0 };
      });
      setProducts(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimeout;

    const handleKeyDown = (e) => {
      // Atajos de teclado globales
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Buscar"]');
        if (searchInput) searchInput.focus();
        return;
      }
      
      if (e.key === 'F4') {
        e.preventDefault();
        const btnEmitir = document.getElementById('btn-emitir');
        if (btnEmitir && !btnEmitir.disabled) btnEmitir.click();
        return;
      }

      // Ignorar lectura de escáner si está escribiendo en un input, textarea o select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        return;
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          const product = products.find(p => p.barcode === barcodeBuffer || p.sku === barcodeBuffer);
          if (product) {
            handleSelectProduct(product);
          } else {
            console.warn('Barcode no encontrado:', barcodeBuffer);
          }
          barcodeBuffer = '';
        }
        return;
      }

      // Si es un caracter imprimible, agregarlo al buffer
      if (e.key.length === 1) {
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimeout);
        // Los lectores de códigos de barras escriben muy rápido, 100ms es suficiente
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, items]); // items está incluido porque handleSelectProduct usa items del state actual

  const handleCameraScan = (decodedText) => {
    const product = products.find(p => p.barcode === decodedText || p.sku === decodedText);
    if (product) {
      handleSelectProduct(product);
      setShowScanner(false);
    } else {
      alert(`Código ${decodedText} no encontrado en el catálogo.`);
    }
  };

  const handleSelectProduct = (product) => {
    const existingItem = items.find(i => i.id === product.id && i.sale_type === 'UNIDAD');
    const currentQty = existingItem ? existingItem.quantity : 0;
    
    const isStockRestricted = !product.is_service && !product.is_subscription && tenantInfo?.allow_negative_stock === false;
    
    if (isStockRestricted && currentQty >= product.stock) {
      alert(`No hay stock suficiente. Stock actual: ${product.stock}`);
      return;
    }
    
    if (existingItem) {
      // Increase quantity by 1
      const newQty = existingItem.quantity + 1;
      setItems(items.map(i => 
        i.id === product.id && i.sale_type === 'UNIDAD'
          ? { ...i, quantity: newQty, total: newQty * i.price }
          : i
      ));
    } else {
      // Add new unit
      setItems([...items, {
        id: product.id,
        name: product.name,
        price: Number(product.price) || 0,
        cost: Number(product.cost) || 0,
        units_per_box: product.units_per_box || 1,
        box_price: Number(product.box_price) > 0 ? Number(product.box_price) : (Number(product.price || 0) * Number(product.units_per_box || 1)),
        is_service: product.is_service || false,
        is_subscription: product.is_subscription || false,
        subscription_days: product.subscription_days || 30,
        is_taxable: product.is_taxable !== false,
        sale_type: 'UNIDAD',
        quantity: 1,
        total: Number(product.price) || 0
      }]);
    }
  };

  const updateItemQuantity = (index, delta, type = 'UNIDAD') => {
    const newItems = [...items];
    const item = newItems[index];
    const product = products.find(p => p.id === item.id) || {};
    
    const newQty = item.quantity + delta;
    
    if (delta > 0) { // Si está incrementando
      const isStockRestricted = !product.is_service && !product.is_subscription && tenantInfo?.allow_negative_stock === false;
      const currentStock = product.stock || 0;
      
      let unitsToAdd = delta;
      if (type === 'CAJA') {
        unitsToAdd = delta * (product.units_per_box || 1);
      }
      
      const totalUnitsRequested = (item.quantity * (type === 'CAJA' ? (product.units_per_box || 1) : 1)) + unitsToAdd;
      
      if (isStockRestricted && totalUnitsRequested > currentStock) {
        alert(`No hay stock suficiente. Stock actual: ${currentStock}`);
        return;
      }
    }

    if (newQty < 1) {
      newItems.splice(index, 1);
    } else {
      item.quantity = newQty;
      item.total = newQty * (type === 'CAJA' ? item.box_price : item.price);
    }
    setItems(newItems);
  };

  const changeQuantity = (index, qty) => {
    const newItems = [...items];
    const item = newItems[index];
    const product = products.find(p => p.id === item.id) || {};
    const numQty = Number(qty) || 0;
    
    if (numQty > item.quantity) { // Solo si aumenta
      const isStockRestricted = !product.is_service && !product.is_subscription && tenantInfo?.allow_negative_stock === false;
      const currentStock = product.stock || 0;
      const totalUnitsRequested = numQty * (item.sale_type === 'CAJA' ? (product.units_per_box || 1) : 1);
      
      if (isStockRestricted && totalUnitsRequested > currentStock) {
        alert(`No hay stock suficiente. Stock actual: ${currentStock}`);
        return;
      }
    }
    
    item.quantity = numQty;
    item.total = numQty * (item.sale_type === 'CAJA' ? item.box_price : item.price);
    setItems(newItems);
  };

  const changeSaleType = (index, type) => {
    const newItems = [...items];
    const item = newItems[index];
    const product = products.find(p => p.id === item.id) || {};
    item.sale_type = type;
    
    // Si no tiene precio de caja definido explícitamente en BD, lo calculamos: precio * unidades
    const calculatedBoxPrice = Number(product.box_price) > 0 
      ? Number(product.box_price) 
      : (Number(product.price || 0) * Number(product.units_per_box || 1));
      
    item.price = type === 'CAJA' ? calculatedBoxPrice : (Number(product.price) || 0);
    // Aseguramos que box_price en el item también esté actualizado
    item.box_price = calculatedBoxPrice;
    
    item.total = item.quantity * item.price;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalOrder = items.reduce((acc, curr) => acc + curr.total, 0);
  
  // Calcular IVA hacia atrás (Desglose)
  const taxRate = tenantInfo?.tax_iva ? (tenantInfo.tax_iva / 100) : 0.13;
  const tax_iva = items.reduce((acc, curr) => {
    if (curr.is_taxable) {
      return acc + (curr.total - (curr.total / (1 + taxRate)));
    }
    return acc;
  }, 0);
  const subtotal = totalOrder - tax_iva;

  const handleSaveOrder = async () => {
    if (items.length === 0) return;
    
    // Validar membresías vs consumidor final
    const hasSubscription = items.some(i => i.is_subscription);
    if (hasSubscription && !selectedClientId) {
      alert("La venta contiene suscripciones o membresías. Es obligatorio seleccionar un Cliente válido.");
      return;
    }

    if (!selectedSellerId) {
      alert("Debes seleccionar un Vendedor para registrar la venta.");
      return;
    }

    // Validar Límite de Crédito
    if (paymentMethod === 'CREDITO') {
      if (!selectedClientId) {
        alert("Debes seleccionar un cliente para facturar al crédito.");
        return;
      }

      const client = clients.find(c => c.id === selectedClientId);
      const creditLimit = Number(client?.credit_limit || 0);

      if (creditLimit > 0) {
        // TotalOrder ya tiene IVA incluido según los precios.
        const totalCalc = parseFloat(totalOrder.toFixed(2));

        const { data: accounts } = await supabase
          .from('accounts_receivable')
          .select('balance')
          .eq('client_id', selectedClientId)
          .gt('balance', 0);
          
        const currentDebt = accounts ? accounts.reduce((acc, a) => acc + Number(a.balance), 0) : 0;

        if (currentDebt + totalCalc > creditLimit) {
          alert(`❌ CRÉDITO RECHAZADO: El cliente tiene un límite de $${creditLimit.toFixed(2)}.\n\nDeuda actual: $${currentDebt.toFixed(2)}\nVenta actual: $${totalCalc.toFixed(2)}\nTotal proyectado: $${(currentDebt + totalCalc).toFixed(2)}\n\nOperación bloqueada para proteger la liquidez.`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      // 1. Obtener perfil del usuario (tenant_id y branch_id)
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (!userId) throw new Error('No hay sesión activa.');

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('tenant_id, branch_id')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('No se pudo obtener el perfil de empresa. Asegúrate de haber completado el Onboarding.');
      }

      const { tenant_id, branch_id } = profile;

      // 2. Calcular totales (Reutilizamos el desglose hacia atrás)
      const subtotalDb = parseFloat(subtotal.toFixed(2));
      const tax_ivaDb = parseFloat(tax_iva.toFixed(2));
      const totalDb = parseFloat(Math.max(0, totalOrder - pointsToUse).toFixed(2));
      const dteTipo = selectedClientId ? '03' : '01'; // 03=CCF, 01=FCF
      const codigoGeneracion = crypto.randomUUID();

      // 3. Crear la Venta en la tabla 'sales'
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          tenant_id,
          branch_id,
          client_id: selectedClientId || null,
          seller_id: selectedSellerId,
          cashier_id: userId,
          subtotal: subtotalDb,
          tax_iva: tax_ivaDb,
          total: totalDb,
          status: 'COMPLETADA',
          payment_method: paymentMethod,
          balance: paymentMethod === 'CREDITO' ? totalDb : 0,
          shift_id: activeShift ? activeShift.id : null,
          driver_id: (selectedDriverId && selectedDriverId !== 'PENDING') ? selectedDriverId : null,
          delivery_status: selectedDriverId ? 'PENDIENTE_DE_CARGA' : 'ENTREGADO'
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // 4. Crear el DTE asociado a esa venta en la tabla 'dtes'
      const { error: dteError } = await supabase
        .from('dtes')
        .insert([{
          tenant_id,
          sale_id: sale.id,
          dte_type: dteTipo,
          codigo_generacion: codigoGeneracion,
          status: 'PENDIENTE',
        }]);

      if (dteError) throw dteError;

      // 5. Generar partida contable automática
      const { error: rpcError } = await supabase.rpc('create_sale_journal_entry', {
        p_sale_id: sale.id
      });
      if (rpcError) console.error("Error contabilidad:", rpcError);

      // 4.5 Registrar los items de la venta
      const saleItemsData = items.map(item => {
        const isBox = item.sale_type === 'CAJA';
        const qty = isBox ? (item.quantity * (item.units_per_box || 1)) : item.quantity;
        const price = isBox ? (item.price / (item.units_per_box || 1)) : item.price;
        
        return {
          tenant_id,
          sale_id: sale.id,
          product_id: item.id,
          quantity: qty,
          unit_price: price,
          unit_cost: item.cost || 0,
          subtotal: item.total
        };
      });
      
      const { error: itemsError } = await supabase.from('sale_items').insert(saleItemsData);
      if (itemsError) throw itemsError;

      // 4.6 Descontar del inventario (Omitir servicios y suscripciones)
      for (const item of items) {
        if (item.is_subscription && selectedClientId) {
          // Procesar suscripción si es membresía
          const { error: subError } = await supabase.rpc('process_subscription_sale', {
            p_client_id: selectedClientId,
            p_product_id: item.id,
            p_days: item.subscription_days
          });
          if (subError) console.error("Error al procesar suscripción:", subError);
        }

        if (item.is_service || item.is_subscription) continue; // No descontar inventario si es servicio o suscripcion

        const { data: existing } = await supabase
          .from('inventory')
          .select('id, stock')
          .eq('product_id', item.id)
          .eq('branch_id', branch_id)
          .single();

        if (existing) {
          // If CAJA, deduct quantity * units_per_box
          const deduction = item.sale_type === 'CAJA' ? (item.quantity * item.units_per_box) : item.quantity;
          const newStock = existing.stock - deduction;
          
          await supabase
            .from('inventory')
            .update({ stock: newStock, last_updated: new Date().toISOString() })
            .eq('id', existing.id);

          // Kardex
          await supabase.from('inventory_movements').insert([{
            tenant_id,
            branch_id,
            product_id: item.id,
            movement_type: 'OUT',
            quantity: deduction,
            previous_stock: existing.stock,
            new_stock: newStock,
            reference_id: sale.id,
            description: `Venta (POS) - ${item.quantity} ${item.sale_type}`,
            created_by: userId
          }]);

          // 4.6.1 FIFO Descuento de lotes
          const { data: batches } = await supabase
            .from('product_batches')
            .select('*')
            .eq('product_id', item.id)
            .eq('branch_id', branch_id)
            .gt('current_stock', 0)
            .order('expiration_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });

          if (batches && batches.length > 0) {
            let remainingDeduction = deduction;
            for (const batch of batches) {
              if (remainingDeduction <= 0) break;
              
              const taken = Math.min(batch.current_stock, remainingDeduction);
              remainingDeduction -= taken;
              
              await supabase
                .from('product_batches')
                .update({ current_stock: batch.current_stock - taken })
                .eq('id', batch.id);
            }
          }
        }
      }

      // 4.7 Gestión de Puntos de Fidelización
      const pointsEarned = Math.floor(totalDb);
      const pointsSpent = pointsToUse > 0 ? pointsToUse : 0;
      
      if (selectedClientId && (pointsEarned > 0 || pointsSpent > 0)) {
        const client = clients.find(c => c.id === selectedClientId);
        if (client) {
          const newBalance = (client.points_balance || 0) + pointsEarned - pointsSpent;
          // Actualizar tabla clients
          await supabase.from('clients').update({ points_balance: newBalance }).eq('id', selectedClientId);
          
          if (pointsEarned > 0) {
            await supabase.from('client_points_history').insert({
              tenant_id, client_id: selectedClientId, sale_id: sale.id, points_change: pointsEarned, description: 'Puntos ganados por compra en POS'
            });
          }
          if (pointsSpent > 0) {
            await supabase.from('client_points_history').insert({
              tenant_id, client_id: selectedClientId, sale_id: sale.id, points_change: -pointsSpent, description: 'Puntos canjeados como descuento'
            });
          }
        }
      }

      // 5. Éxito
      const tipoLabel = dteTipo === '03' ? 'CCF' : 'FCF';
      
      const clientObj = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
      const sellerObj = selectedSellerId ? sellers.find(s => s.id === selectedSellerId) : null;
      
      // Store data for printing
      setLastSaleData({
        sale: {
          id: sale.id,
          created_at: new Date().toISOString(),
          dte_code: `DTE-${tipoLabel}-00000${Math.floor(Math.random() * 1000)}`, // Simulate DTE
          subtotal: subtotal,
          tax_amount: tax_iva,
          total: totalOrder,
          clients: clientObj,
          sellers: sellerObj
        },
        items: items.map(item => ({
          ...item,
          products: { name: item.name } // Reconstruct product obj
        }))
      });

      setPrintModalOpen(true);

      setItems([]);
      setSelectedClientId('');
      setSelectedDriverId('');
      setPaymentMethod('CONTADO');
      
      const quoteId = searchParams.get('quote');
      if (quoteId) {
        await supabase.from('quotes').update({ status: 'CONVERTED' }).eq('id', quoteId);
        navigate('/ventas'); // Clear URL
      }
    } catch (err) {
      console.error('Error al emitir documento:', err);
      alert('Error al emitir: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando inventario y clientes...</div>;
  }

  if (!activeShift) {
    return (
      <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <Lock size={64} style={{ color: '#ef4444', marginBottom: '20px' }} />
        <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>Turno de Caja Cerrado</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Para poder facturar, necesitas realizar la apertura de caja.</p>
        <Link to="/caja" className="glass-button" style={{ background: '#3b82f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={18} /> Ir a Gestión de Caja
        </Link>
      </div>
    );
  }

  return (
    <div className="page-full-height" style={{ gap: '24px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h1 className="page-title">Ventas (POS)</h1>
        <Link to="/caja" className="glass-button" style={{ background: '#ef4444', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={16} /> Cerrar Turno
        </Link>
      </div>

      <div className="grid-2-1" style={{ alignItems: 'flex-start', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Left side: Current Items (Focus on Products) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden', height: '100%' }}>
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>1. Construir Venta</h3>
            
            <div style={{ marginBottom: '24px', zIndex: 10 }}>
              <ProductSearch 
                products={products} 
                onSelect={handleSelectProduct} 
                onCameraClick={() => setShowScanner(true)}
              />
            </div>

            {showScanner && (
              <div className="modal-overlay" style={{ zIndex: 100 }}>
                <CameraScanner 
                  onScan={handleCameraScan} 
                  onClose={() => setShowScanner(false)} 
                />
              </div>
            )}

            <div className="panel-scrollable">
              <table className="glass-table">
                <thead>
                  <tr>
                    <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Producto</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Tipo</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Cant.</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Precio Unit.</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Subtotal</th>
                    <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bg-card)' }}>Acción</th>
                  </tr>
                </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.name}</td>
                    <td>
                      <select 
                        className="glass-input" 
                        style={{ padding: '4px', fontSize: '12px', minWidth: '100px' }}
                        value={item.sale_type}
                        onChange={(e) => changeSaleType(index, e.target.value)}
                      >
                        <option value="UNIDAD">Unidad</option>
                        {item.units_per_box > 1 && (
                          <option value="CAJA">Caja (x{item.units_per_box})</option>
                        )}
                      </select>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="1" 
                        className="glass-input" 
                        style={{ padding: '4px', width: '60px', textAlign: 'center' }}
                        value={item.quantity} 
                        onChange={e => changeQuantity(index, e.target.value)} 
                      />
                    </td>
                    <td style={{ fontWeight: 'bold' }}>${item.price.toFixed(2)}</td>
                    <td style={{ fontWeight: 'bold', color: '#10b981' }}>${item.total.toFixed(2)}</td>
                    <td>
                      <button onClick={() => removeItem(index)} style={{ color: '#f87171', background: 'none', border: 'none', cursor: 'pointer' }}>Quitar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right side: Summary & Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', paddingRight: '4px', height: '100%' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>2. Datos de la Venta</h3>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Cliente</label>
              <select 
                className="glass-input"
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setPointsToUse(0);
                }}
              >
                <option value="">-- Sin Cliente Asociado --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.document_number || 'Sin Doc'})</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Vendedor *</label>
              <select 
                className="glass-input"
                value={selectedSellerId}
                onChange={(e) => setSelectedSellerId(e.target.value)}
                required
              >
                <option value="">-- Selecciona Vendedor --</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Método de Pago</label>
              <select 
                className="glass-input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta (Crédito/Débito)</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="CREDITO">Crédito (Cuenta por Cobrar)</option>
              </select>
            </div>

            {tenantInfo?.module_logistics !== false && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Repartidor / Ruta (Opcional)</label>
                <select 
                  className="glass-input" 
                  value={selectedDriverId} 
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  <option value="">-- Entregado en tienda --</option>
                  <option value="PENDING">-- Enviar luego (Asignar después) --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} {d.plate_number ? `(${d.plate_number})` : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>Resumen</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal (Sin IVA):</span>
              <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-muted)' }}>IVA ({(tenantInfo?.tax_iva || 13)}%):</span>
            <span>${tax_iva.toFixed(2)}</span>
          </div>
          {pointsToUse > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: '#10b981' }}>
              <span>Descuento por Puntos:</span>
              <span>-${pointsToUse.toFixed(2)}</span>
            </div>
          )}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '16px', 
            borderTop: '1px solid var(--border-color)',
            marginBottom: '24px'
          }}>
            <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary)' }}>Total a Cobrar:</span>
            <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
              ${Math.max(0, totalOrder - pointsToUse).toFixed(2)}
            </span>
          </div>

          {selectedClientId && (() => {
            const client = clients.find(c => c.id === selectedClientId);
            const balance = client?.points_balance || 0;
            const pointsEarned = Math.floor(Math.max(0, totalOrder - pointsToUse));
            return (
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 'bold' }}>⭐ Puntos: {balance}</span>
                  <span style={{ color: '#10b981', fontSize: '12px' }}>+ {pointsEarned} pts hoy</span>
                </div>
                {balance > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      className="glass-input" 
                      style={{ padding: '6px', fontSize: '12px', flex: 1 }}
                      placeholder="Pts a usar"
                      max={balance}
                      min={0}
                      value={pointsToUse || ''}
                      onChange={(e) => {
                        let val = Number(e.target.value) || 0;
                        if (val > balance) val = balance;
                        if (val > totalOrder) val = Math.floor(totalOrder); // Can't discount more than total
                        setPointsToUse(val);
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })()}

          <button
            id="btn-emitir"
            className="glass-button"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={items.length === 0 || saving || !selectedSellerId}
            onClick={handleSaveOrder}
          >
            <Save size={18} /> {saving ? 'Enviando...' : 'Emitir Documento (F4)'}
          </button>

          {/* Nota sobre el estado inicial del DTE */}
          <div style={{
            marginTop: '16px',
            padding: '10px 12px',
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}>
            <Info size={14} color="#fbbf24" style={{ marginTop: '1px', flexShrink: 0 }} />
            <span>
              El documento se creará en estado <strong style={{ color: '#fbbf24' }}>Pendiente</strong>.
              El firmador lo sellará cuando Hacienda lo apruebe.
            </span>
          </div>
        </div>
      </div>
      </div>
      {printModalOpen && (
        <div className="modal-overlay">
          <div className="glass-panel" style={{ padding: '24px', width: '400px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '16px', color: '#10b981' }}>¡Venta Exitosa!</h2>
            <p style={{ marginBottom: '24px', color: 'var(--text-muted)' }}>¿Deseas imprimir el comprobante para el cliente?</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="glass-button" 
                onClick={() => printDocument(lastSaleData.sale, lastSaleData.items, tenantInfo, 'TICKET')}
              >
                Imprimir Ticket (POS)
              </button>
              <button 
                className="glass-button" 
                onClick={() => printDocument(lastSaleData.sale, lastSaleData.items, tenantInfo, 'PDF')}
              >
                Imprimir PDF (Carta)
              </button>
              <button 
                className="glass-button" 
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                onClick={() => setPrintModalOpen(false)}
              >
                No Imprimir (Cerrar)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;
