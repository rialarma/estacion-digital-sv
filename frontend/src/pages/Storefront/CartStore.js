import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../../supabase';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: async (product, tenantId) => {
        set((state) => {
          const existing = state.items.find(i => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
            };
          }
          return { items: [...state.items, { ...product, quantity: 1 }] };
        });
        await get().syncWithCloud(tenantId);
      },
      removeItem: async (productId, tenantId) => {
        set((state) => ({
          items: state.items.filter(i => i.id !== productId)
        }));
        await get().syncWithCloud(tenantId);
      },
      updateQuantity: async (productId, quantity, tenantId) => {
        set((state) => ({
          items: state.items.map(i => i.id === productId ? { ...i, quantity } : i)
        }));
        await get().syncWithCloud(tenantId);
      },
      clearCart: async (tenantId) => {
        set({ items: [] });
        await get().syncWithCloud(tenantId);
      },
      
      getTotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      syncWithCloud: async (tenantId) => {
        if (!tenantId) return;
        
        try {
          // Obtener sesión actual
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return; // Solo sincronizar si hay usuario logueado

          // Obtener el perfil del cliente para este tenant
          const { data: profile } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('tenant_id', tenantId)
            .single();

          if (!profile) return; // Si no tiene perfil, no podemos guardar el carrito

          const currentItems = get().items.map(item => ({
            product_id: item.id,
            quantity: item.quantity
          }));

          // Llamar al RPC para sincronizar
          const { data: cloudItems, error } = await supabase.rpc('sync_store_cart', {
            p_tenant_id: tenantId,
            p_client_id: profile.id,
            p_items: currentItems
          });

          if (!error && cloudItems) {
            // No sobreescribimos el carrito local directamente para no perder detalles como imagen o nombre,
            // pero podríamos hacer un fetch de los productos si fuera necesario. 
            // Como siempre empujamos el local hacia la nube, la nube se mantiene actualizada.
          }
        } catch (err) {
          console.error("Error sincronizando carrito con la nube:", err);
        }
      },

      fetchCloudCart: async (tenantId) => {
        if (!tenantId) return;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user) return;

          const { data: profile } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('tenant_id', tenantId)
            .single();

          if (!profile) return;

          // Obtener carrito de la nube
          const { data: cloudCart } = await supabase
            .from('store_carts')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('client_id', profile.id)
            .single();

          if (cloudCart) {
            const { data: cloudItems } = await supabase
              .from('store_cart_items')
              .select('quantity, products(*)')
              .eq('cart_id', cloudCart.id);

            if (cloudItems && cloudItems.length > 0) {
              // Convertir items de la BD al formato del store
              const mergedItems = cloudItems.map(item => ({
                ...item.products,
                quantity: item.quantity
              }));
              
              // Si el carrito local está vacío pero hay en la nube, cargar el de la nube
              if (get().items.length === 0) {
                set({ items: mergedItems });
              }
            }
          }
        } catch (err) {
          console.error("Error obteniendo carrito de la nube:", err);
        }
      }
    }),
    {
      name: 'storefront-cart-storage',
    }
  )
);
