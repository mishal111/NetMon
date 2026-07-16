import React, { useState } from 'react';
import { Database, ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';
import PacketInspector from './PacketInspector';

export default function LivePacketStream({ packets }) {
  const { filters } = useStore();
  const [expandedRow, setExpandedRow] = useState(null);

  const getProtocolColor = (proto) => {
    switch (proto) {
      case 6: return 'text-primary-blue'; // TCP
      case 17: return 'text-severity-medium'; // UDP
      case 1: return 'text-severity-critical'; // ICMP
      default: return 'text-gray-400';
    }
  };

  const getProtocolName = (proto) => {
    switch (proto) {
      case 6: return 'TCP';
      case 17: return 'UDP';
      case 1: return 'ICMP';
      default: return `Proto-${proto}`;
    }
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Apply filters from Zustand store
  const filteredPackets = packets.filter((pkt) => {
    if (filters.sourceIp && !pkt.src_ip.includes(filters.sourceIp)) return false;
    if (filters.destIp && !pkt.dst_ip.includes(filters.destIp)) return false;
    if (filters.protocol !== 'ALL' && pkt.protocol.toString() !== filters.protocol) return false;
    if (filters.port && pkt.port?.toString() !== filters.port) return false;
    return true;
  });

  return (
    <div className="glass-panel p-5 flex flex-col h-full flex-1">
      <div className="flex items-center gap-2 mb-4">
        <Database className="text-gray-300 w-5 h-5" />
        <h2 className="text-lg font-semibold text-gray-200">Live Packet Stream</h2>
        <span className="ml-auto text-xs font-mono bg-primary-blue/10 text-primary-blue px-2 py-1 rounded-full animate-pulse-slow">
          LIVE
        </span>
      </div>
      
      <div className="flex-1 overflow-auto rounded-lg border border-dark-border bg-dark-base">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="text-xs uppercase bg-dark-card text-gray-300 sticky top-0 border-b border-dark-border z-10">
            <tr>
              <th className="px-4 py-3 w-8"></th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Source IP</th>
              <th className="px-4 py-3 font-medium">Dest IP</th>
              <th className="px-4 py-3 font-medium">Protocol</th>
              <th className="px-4 py-3 font-medium">Port</th>
              <th className="px-4 py-3 font-medium">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {filteredPackets.length > 0 ? (
              filteredPackets.map((pkt) => (
                <React.Fragment key={pkt.id}>
                  <tr 
                    onClick={() => toggleRow(pkt.id)}
                    className="hover:bg-dark-card/50 transition-colors font-mono text-xs cursor-pointer group"
                  >
                    <td className="px-4 py-2 text-dark-border group-hover:text-primary-blue transition-colors">
                      {expandedRow === pkt.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(pkt.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 3 })}
                    </td>
                    <td className="px-4 py-2">{pkt.src_ip}</td>
                    <td className="px-4 py-2">{pkt.dst_ip}</td>
                    <td className={`px-4 py-2 font-semibold ${getProtocolColor(pkt.protocol)}`}>
                      {getProtocolName(pkt.protocol)}
                    </td>
                    <td className="px-4 py-2">{pkt.port || '-'}</td>
                    <td className="px-4 py-2">{pkt.size ? `${pkt.size} B` : '-'}</td>
                  </tr>
                  {/* Expandable Inspector Row */}
                  <AnimatePresence>
                    {expandedRow === pkt.id && (
                      <tr>
                        <td colSpan="7" className="p-0">
                          <PacketInspector packet={pkt} />
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                  {packets.length === 0 ? "No packets captured yet." : "No packets match the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
