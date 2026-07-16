import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export default function Header({ connected }) {
  return (
    <div className="relative overflow-hidden glass-panel mb-6 px-6 py-5 rounded-2xl">
      {/* Animated Background Mesh/Blobs */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <motion.div
          animate={{
            x: [0, 50, -50, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-primary-blue blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -40, 40, 0],
            y: [0, 50, -50, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 right-1/4 w-72 h-72 rounded-full bg-severity-success blur-3xl opacity-50"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="bg-dark-base p-3 rounded-xl border border-dark-border shadow-lg"
          >
            <ShieldCheck className="w-8 h-8 text-primary-blue" />
          </motion.div>
          
          <div>
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-bold tracking-tight text-white"
            >
              Security Command Center
            </motion.h1>
            <motion.p 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-gray-400 mt-1"
            >
              Enterprise Network Monitoring
            </motion.p>
          </div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-3 bg-dark-base/50 border border-dark-border px-4 py-2 rounded-full"
        >
          <div className="flex items-center justify-center relative">
            {connected && (
              <span className="absolute w-3 h-3 rounded-full bg-severity-success opacity-75 animate-ping"></span>
            )}
            <span className={`relative w-2.5 h-2.5 rounded-full ${connected ? 'bg-severity-success' : 'bg-severity-critical'}`}></span>
          </div>
          <span className="text-sm font-medium text-gray-300">
            {connected ? 'Live Network Monitoring Active' : 'System Disconnected'}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
