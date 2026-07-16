import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AlertBadge from './AlertBadge';

export default function AlertPanel({ alerts }) {
  return (
    <div className="glass-panel p-5 flex flex-col h-full glow-critical border-severity-critical/30">
      <div className="flex items-center gap-2 mb-4 text-severity-critical">
        <ShieldAlert className="w-5 h-5" />
        <h2 className="text-lg font-bold tracking-wider">ACTIVE THREATS</h2>
        <span className="ml-auto bg-severity-critical/20 text-severity-critical text-xs font-bold px-2 py-1 rounded-full">
          {alerts.length} DETECTED
        </span>
      </div>
      
      <div className="flex-1 overflow-auto pr-2 relative">
        <AnimatePresence>
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-severity-success"
            >
              <ShieldAlert className="w-10 h-10 mb-3 opacity-80" />
              <span className="text-sm font-semibold tracking-wide">SYSTEM SECURE</span>
              <span className="text-xs opacity-60 mt-1">No active threats detected in current window.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
