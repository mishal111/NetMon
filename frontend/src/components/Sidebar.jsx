import React from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, List, Activity, ShieldAlert, Settings } from 'lucide-react';
import useStore from '../store/useStore';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'packets', label: 'Packets', icon: List },
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'alerts', label: 'Alerts', icon: ShieldAlert },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { activeView, setActiveView } = useStore();

  return (
    <div className="w-20 lg:w-64 h-full flex flex-col bg-dark-card/90 backdrop-blur-md border-r border-dark-border py-6 transition-all duration-300 z-50 shrink-0 shadow-2xl">
      <div className="flex flex-col gap-2 px-3 lg:px-4 mt-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-dark-border/30'
              }`}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary-blue/20 border border-primary-blue/50 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <div className="relative z-10 flex items-center justify-center">
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-blue' : 'group-hover:text-primary-blue/70'}`} />
              </div>
              
              <span className={`relative z-10 font-medium text-sm hidden lg:block tracking-wide ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
