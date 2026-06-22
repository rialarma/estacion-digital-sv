import { create } from 'zustand';

export const useTenantStore = create((set) => ({
  tenantId: null,
  tenantInfo: null,
  setTenant: (id, info) => set({ tenantId: id, tenantInfo: info }),
  updateTenantInfo: (info) => set(state => ({ tenantInfo: { ...state.tenantInfo, ...info } })),
  clearTenant: () => set({ tenantId: null, tenantInfo: null }),
}));
