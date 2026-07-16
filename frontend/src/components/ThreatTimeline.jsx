import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Clock } from 'lucide-react';

export default function ThreatTimeline({ alerts }) {
  
  const getSeverityStyle = (severity) => {
    switch(severity?.toUpperCase()) {
      case 'CRITICAL':
      case 'HIGH':
        return { color: 'text-severity-critical', bg: 'bg-severity-critical', icon: ShieldAlert };
      case 'MEDIUM':
        return { color: 'text-severity-high', bg: 'bg-severity-high', icon: AlertTriangle };
      case 'LOW':
        return { color: 'text-severity-medium', bg: 'bg-severity-medium', icon: AlertCircle };
      default:
        return { color: 'text-primary-blue', bg: 'bg-primary-blue', icon: Info };
    }
  };

  // Sort alerts chronological (newest first usually for timelines, or oldest. Let's do newest first).
  const sortedAlerts = [...alerts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="glass-panel p-6 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-8 border-b border-dark-border pb-4">
        <Clock className="w-5 h-5 text-gray-400" />
        <h2 className="text-xl font-bold text-gray-200">24-Hour Threat Timeline</h2>
        <span className="ml-auto bg-dark-base px-3 py-1 rounded-full text-xs font-mono text-gray-400 border border-dark-border">
          {alerts.length} EVENTS
        </span>
      </div>

      <div className="relative border-l-2 border-dark-border ml-4 space-y-8 pb-4">
        {sortedAlerts.length > 0 ? (
          sortedAlerts.map((alert, index) => {
            const { color, bg, icon: Icon } = getSeverityStyle(alert.severity);
            
            // Extract IP if possible
            const ipMatch = alert.description.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);
            const sourceIp = ipMatch ? ipMatch[0] : 'Unknown Origin';

            return (
              <motion.div 
                key={alert.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-8 group"
              >
                {/* Timeline Dot */}
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ${bg} border-4 border-dark-card shadow-lg`}></div>
                
                {/* Content Card */}
                <div className="bg-dark-base/50 border border-dark-border rounded-xl p-4 hover:bg-dark-base transition-colors shadow-sm group-hover:shadow-md relative overflow-hidden">
                  
                  {/* Subtle hover gradient */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${bg}`}></div>
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className={`flex items-center gap-2 font-bold ${color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="uppercase tracking-widest text-sm">{alert.alert_type}</span>
                    </div>
                    <span className="text-xs font-mono text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3">
                    {alert.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs font-mono border-t border-dark-border/50 pt-2">
                    <span className="text-gray-400">SRC: <span className="text-gray-200">{sourceIp}</span></span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${color} bg-dark-card border border-dark-border`}>
                      {alert.severity} RISK
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="pl-8 py-8 text-gray-500 font-medium">
            No security events recorded in the last 24 hours.
          </div>
        )}
      </div>
    </div>
  );
}
