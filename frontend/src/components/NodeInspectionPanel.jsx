import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Copy, Check, Download, Shield, ShieldOff, Activity, 
  Network, Database, AlertTriangle, Info 
} from 'lucide-react';
import Papa from 'papaparse';

export default function NodeInspectionPanel({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);

  if (!data) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(data.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(data.recentPackets.map(p => ({
      Time: new Date(p.timestamp).toISOString(),
      Src: p.src_ip,
      Dst: p.dst_ip,
      Proto: p.protocol,
      Port: p.port,
      Size: p.size
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ip_history_${data.ip}_${Date.now()}.csv`;
    a.click();
    showMsg('CSV Exported');
  };

  const showMsg = (msg) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  };

  const isThreat = data.classification === 'Threat Detected';
  const isInternal = data.classification === 'Internal Network';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm"
      />

      {/* Side Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
        className="absolute right-0 top-0 bottom-0 w-full md:w-1/2 z-50 bg-dark-card border-l border-dark-border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-dark-border bg-dark-base flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold tracking-wider text-primary-blue font-mono">{data.ip}</h2>
              <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors" title="Copy IP">
                {copied ? <Check className="w-5 h-5 text-severity-success" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold uppercase tracking-widest ${
              isThreat ? 'bg-severity-critical/20 border-severity-critical text-severity-critical' :
              isInternal ? 'bg-severity-success/20 border-severity-success text-severity-success' :
              'bg-gray-800 border-gray-600 text-gray-400'
            }`}>
              {isThreat ? <AlertTriangle className="w-3.5 h-3.5" /> : 
               isInternal ? <Shield className="w-3.5 h-3.5" /> : 
               <Info className="w-3.5 h-3.5" />}
              {data.classification}
            </div>
          </div>
          
          <button onClick={onClose} className="p-2 bg-dark-border/50 hover:bg-dark-border rounded-lg text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-dark-border bg-dark-base/50 flex flex-wrap gap-3">
          <button onClick={handleExportCSV} className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-dark-border/50 hover:bg-dark-border border border-gray-700 rounded text-gray-300 transition-colors">
            <Download className="w-4 h-4" /> Export History
          </button>
          <button onClick={() => showMsg('IP Whitelisted (Mock)')} className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-severity-success/10 hover:bg-severity-success/20 border border-severity-success/50 rounded text-severity-success transition-colors">
            <Shield className="w-4 h-4" /> Whitelist
          </button>
          <button onClick={() => showMsg('IP Blacklisted (Mock)')} className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-severity-critical/10 hover:bg-severity-critical/20 border border-severity-critical/50 rounded text-severity-critical transition-colors">
            <ShieldOff className="w-4 h-4" /> Blacklist
          </button>
          
          <AnimatePresence>
            {actionMsg && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ml-auto text-xs text-primary-blue self-center font-medium">
                {actionMsg}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-dark-base border border-dark-border rounded-lg p-4">
              <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Activity className="w-4 h-4"/> Sent</div>
              <div className="text-xl font-mono text-gray-200">{data.stats.sent}</div>
            </div>
            <div className="bg-dark-base border border-dark-border rounded-lg p-4">
              <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Activity className="w-4 h-4"/> Received</div>
              <div className="text-xl font-mono text-gray-200">{data.stats.received}</div>
            </div>
            <div className="bg-dark-base border border-dark-border rounded-lg p-4">
              <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Database className="w-4 h-4"/> Total Data</div>
              <div className="text-xl font-mono text-primary-blue">{(data.stats.totalBytes / 1024).toFixed(1)} KB</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Protocols */}
            <div>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Network className="w-4 h-4 text-primary-blue"/> Protocols
              </h3>
              <div className="bg-dark-base border border-dark-border rounded-lg overflow-hidden">
                <div className="flex justify-between px-4 py-2 border-b border-dark-border">
                  <span className="text-sm text-gray-400">TCP</span>
                  <span className="text-sm font-mono text-gray-200">{data.protocols.tcp}</span>
                </div>
                <div className="flex justify-between px-4 py-2 border-b border-dark-border bg-dark-card/30">
                  <span className="text-sm text-gray-400">UDP</span>
                  <span className="text-sm font-mono text-gray-200">{data.protocols.udp}</span>
                </div>
                <div className="flex justify-between px-4 py-2 bg-dark-card/30">
                  <span className="text-sm text-gray-400">ICMP</span>
                  <span className="text-sm font-mono text-gray-200">{data.protocols.icmp}</span>
                </div>
              </div>
            </div>

            {/* Top Ports */}
            <div>
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Network className="w-4 h-4 text-primary-blue"/> Top Outbound Ports
              </h3>
              <div className="bg-dark-base border border-dark-border rounded-lg overflow-hidden">
                {data.topPorts.length > 0 ? data.topPorts.map((p, i) => (
                  <div key={i} className={`flex justify-between px-4 py-2 border-b border-dark-border ${i%2===0?'':'bg-dark-card/30'}`}>
                    <span className="text-sm text-gray-400 font-mono">Port {p.port}</span>
                    <span className="text-sm font-mono text-primary-blue">{p.count} pkts</span>
                  </div>
                )) : (
                  <div className="px-4 py-4 text-sm text-gray-500 text-center">No outbound ports recorded.</div>
                )}
              </div>
            </div>
          </div>

          {/* Related Alerts */}
          {data.relatedAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-severity-critical uppercase tracking-widest mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4"/> Associated Security Alerts
              </h3>
              <div className="space-y-3">
                {data.relatedAlerts.map(alert => (
                  <div key={alert.id} className="bg-severity-critical/10 border border-severity-critical/30 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-severity-critical">{alert.alert_type}</span>
                      <span className="text-xs font-mono text-gray-400">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-gray-300">{alert.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Packets */}
          <div>
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-blue"/> Recent Traffic
            </h3>
            <div className="bg-dark-base border border-dark-border rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-card text-gray-400 border-b border-dark-border">
                  <tr>
                    <th className="px-3 py-2 font-medium">Time</th>
                    <th className="px-3 py-2 font-medium">Direction</th>
                    <th className="px-3 py-2 font-medium">Target IP</th>
                    <th className="px-3 py-2 font-medium">Port</th>
                    <th className="px-3 py-2 font-medium">Proto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {data.recentPackets.map(p => {
                    const isOut = p.src_ip === data.ip;
                    return (
                      <tr key={p.id} className="font-mono text-gray-300 hover:bg-dark-border/30 transition-colors">
                        <td className="px-3 py-2 text-gray-500">{new Date(p.timestamp).toLocaleTimeString([], {hour12:false})}</td>
                        <td className="px-3 py-2">
                          {isOut ? <span className="text-primary-blue">OUT &rarr;</span> : <span className="text-severity-success">&larr; IN</span>}
                        </td>
                        <td className="px-3 py-2">{isOut ? p.dst_ip : p.src_ip}</td>
                        <td className="px-3 py-2">{p.port || '-'}</td>
                        <td className="px-3 py-2">{p.protocol === 6 ? 'TCP' : p.protocol === 17 ? 'UDP' : 'ICMP'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </motion.div>
    </>
  );
}
