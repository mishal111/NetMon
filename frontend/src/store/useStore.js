import { create } from 'zustand';

const useStore = create((set) => ({
  activeView: 'overview', // 'overview', 'packets', 'analytics', 'alerts', 'settings'
  setActiveView: (view) => set({ activeView: view }),
  
  // Forensics State
  isRecording: false,
  setIsRecording: (val) => set({ isRecording: val }),
  replayStatus: { active: false, filename: null },
  setReplayStatus: (status) => set({ replayStatus: status }),
  replayProgress: { current: 0, total: 0, status: 'stopped' },
  setReplayProgress: (progress) => set({ replayProgress: progress }),
  
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
