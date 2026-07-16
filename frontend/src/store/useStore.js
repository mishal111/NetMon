import { create } from 'zustand';

const useStore = create((set) => ({
  activeView: 'overview', // 'overview', 'packets', 'analytics', 'alerts', 'settings'
  setActiveView: (view) => set({ activeView: view }),
  
  // Advanced Search Filters
  filters: {
    sourceIp: '',
    destIp: '',
    protocol: 'ALL',
    port: '',
    severity: 'ALL',
  },
  setFilters: (newFilters) => set((state) => ({ 
    filters: { ...state.filters, ...newFilters } 
  })),
  resetFilters: () => set({ 
    filters: { sourceIp: '', destIp: '', protocol: 'ALL', port: '', severity: 'ALL' } 
  }),
}));

export default useStore;
