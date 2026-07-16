import React from 'react';
import { motion } from 'framer-motion';
import { AlertOctagon, AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react';

export default function AlertBadge({ alert }) {
  
  const getSeverityConfig = (severity) => {
    switch(severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        // Our detector.py currently outputs "HIGH" for DDoS
        return {
          color: 'text-severity-critical',
          bg: 'bg-severity-critical/10',
          border: 'border-severity-critical/30',
          icon: AlertOctagon,
          pulse: true,
          glow: 'glow-critical'
        };
      case 'MEDIUM':
        // detector.py outputs "MEDIUM" for Port Scans
        return {
          color: 'text-severity-high',
          bg: 'bg-severity-high/10',
          border: 'border-severity-high/30',
          icon: AlertTriangle,
          pulse: false,
          glow: ''
        };
      case 'LOW':
        return {
          color: 'text-severity-medium',
          bg: 'bg-severity-medium/10',
          border: 'border-severity-medium/30',
          icon: AlertCircle,
          pulse: false,
          glow: ''
        };
      default:
        return {
          color: 'text-primary-blue',
          bg: 'bg-primary-blue/10',
          border: 'border-primary-blue/30',
          icon: Info,
          pulse: false,
          glow: ''
        };
    }
  };

  const config = getSeverityConfig(alert.severity);
  const Icon = config.icon;

  // Attempt to parse Source IP from description if it exists (for port scans)
  const ipMatch = alert.description.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);
  const sourceIp = ipMatch ? ipMatch[0] : 'Unknown IP';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      layout
      className={`relative p-3 rounded-lg border ${config.bg} ${config.border} ${config.glow} mb-3 flex flex-col gap-2`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex items-center gap-2 font-bold ${config.color}`}>
          <div className="relative">
            {config.pulse && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-50 bg-severity-critical"></span>
            )}
            <Icon className="w-4 h-4 relative z-10" />
          </div>
          <span className="text-xs uppercase tracking-wider">{alert.alert_type}</span>
        </div>
        <span className="text-[10px] font-mono text-gray-400 bg-dark-base/50 px-1.5 py-0.5 rounded">
          {new Date(alert.timestamp).toLocaleTimeString([], { hour12: false })}
        </span>
      </div>
      
      <p className="text-sm text-gray-300 leading-snug">
        {alert.description}
      </p>
      
      <div className="flex items-center gap-3 mt-1 pt-2 border-t border-dark-border/50">
        <span className="text-xs text-gray-500 font-mono">SRC: {sourceIp}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ml-auto ${config.color} border ${config.border}`}>
          {alert.severity}
        </span>
      </div>
    </motion.div>
  );
}
