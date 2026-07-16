import React from 'react';
import { Search, RotateCcw, Save, Filter } from 'lucide-react';
import useStore from '../store/useStore';

export default function AdvancedSearch() {
  const { filters, setFilters, resetFilters } = useStore();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters({ [name]: value });
  };

  return (
    <div className="glass-panel p-5 flex flex-col mb-6">
      <div className="flex items-center gap-2 mb-5">
        <Filter className="text-primary-blue w-5 h-5" />
        <h2 className="text-lg font-semibold text-gray-200">Advanced Packet Filtering</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Source IP */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Source IP</label>
          <input 
            type="text" 
            name="sourceIp"
            value={filters.sourceIp}
            onChange={handleChange}
            placeholder="e.g. 192.168.1.5"
            className="bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-blue/50 focus:ring-1 focus:ring-primary-blue/50 transition-all font-mono"
          />
        </div>

        {/* Dest IP */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dest IP</label>
          <input 
            type="text" 
            name="destIp"
            value={filters.destIp}
            onChange={handleChange}
            placeholder="e.g. 8.8.8.8"
            className="bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-blue/50 focus:ring-1 focus:ring-primary-blue/50 transition-all font-mono"
          />
        </div>

        {/* Protocol */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Protocol</label>
          <select 
            name="protocol"
            value={filters.protocol}
            onChange={handleChange}
            className="bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-blue/50 transition-all cursor-pointer font-semibold"
          >
            <option value="ALL">All Protocols</option>
            <option value="6">TCP (6)</option>
            <option value="17">UDP (17)</option>
            <option value="1">ICMP (1)</option>
          </select>
        </div>

        {/* Port */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Port</label>
          <input 
            type="text" 
            name="port"
            value={filters.port}
            onChange={handleChange}
            placeholder="e.g. 443"
            className="bg-dark-base border border-dark-border rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-primary-blue/50 focus:ring-1 focus:ring-primary-blue/50 transition-all font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-end gap-2 lg:col-span-1">
          <button className="flex-1 bg-primary-blue hover:bg-primary-blue/80 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary-blue/20">
            <Search className="w-4 h-4" />
            <span className="text-sm">Apply</span>
          </button>
          
          <button 
            onClick={resetFilters}
            className="p-2 bg-dark-base hover:bg-dark-border border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Reset Filters"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          
          <button 
            className="p-2 bg-dark-base hover:bg-dark-border border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Save Filter Preset"
          >
            <Save className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
