import React from 'react';
import { motion } from 'framer-motion';
import { Server, ArrowRight, Shield, FileDigit } from 'lucide-react';

export default function PacketInspector({ packet }) {
  if (!packet) return null;

  // Generate mock deep-packet data to fulfill UI requirements
  // In a real scenario, this would come from the backend's scapy parsed data.
  const mockMacSrc = "00:1A:2B:3C:4D:5E";
  const mockMacDst = "00:5E:4D:3C:2B:1A";
  const mockTtl = packet.protocol === 1 ? 64 : (packet.protocol === 6 ? 128 : 255);
  const mockFlags = packet.protocol === 6 ? "[SYN, ACK]" : "None";
  
  // Generate a mock hex payload based on size
  const mockHex = Array.from({ length: Math.min(packet.size || 64, 128) }, () => 
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join(' ').match(/.{1,24}/g)?.join('\n') || "00 00 00 00";

  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-dark-base border-y border-dark-border py-4 px-6 col-span-6 w-full"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Source Details */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-primary-blue mb-1">
            <Server className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Source</h4>
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">IP:</span>{packet.src_ip}
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">MAC:</span>{mockMacSrc}
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">PRT:</span>{packet.port || 'Any'}
          </div>
        </div>

        {/* Destination Details */}
        <div className="flex flex-col gap-2 relative">
          <div className="hidden md:block absolute -left-4 top-8 text-dark-border">
            <ArrowRight className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-1.5 text-severity-medium mb-1">
            <Server className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Destination</h4>
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">IP:</span>{packet.dst_ip}
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">MAC:</span>{mockMacDst}
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">PRT:</span>{packet.port || 'Any'}
          </div>
        </div>

        {/* Protocol Details */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-severity-success mb-1">
            <Shield className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Protocol Stats</h4>
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">FLG:</span>{mockFlags}
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">TTL:</span>{mockTtl}
          </div>
          <div className="text-sm font-mono text-gray-300">
            <span className="text-gray-500 mr-2">SIZ:</span>{packet.size || 0} Bytes
          </div>
        </div>

        {/* Payload / Hex View */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <FileDigit className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-widest">Payload Hex</h4>
          </div>
          <div className="bg-[#050505] border border-dark-border rounded p-2 text-xs font-mono text-severity-success whitespace-pre-wrap overflow-hidden h-20 overflow-y-auto custom-scrollbar">
            {mockHex.toUpperCase()}
          </div>
        </div>
        
      </div>
    </motion.div>
  );
}
