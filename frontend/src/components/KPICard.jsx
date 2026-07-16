import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function KPICard({ 
  title, 
  value, 
  unit, 
  trend, 
  trendDirection = 'up', 
  icon: Icon, 
  sparklineData,
  colorClass = 'text-primary-blue'
}) {
  
  // Decide trend color
  const isPositive = trendDirection === 'up';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-severity-success' : 'text-severity-critical';

  return (
    <motion.div 
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="glass-panel p-4 relative overflow-hidden group"
    >
      {/* Subtle background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-dark-base border border-dark-border ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-gray-400">{title}</span>
          </div>
          
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trend}%</span>
            </div>
          )}
        </div>
        
        <div className="flex items-end justify-between mt-2">
          <div className="flex items-baseline gap-1">
            <motion.span 
              key={value}
              initial={{ opacity: 0.5, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-white tracking-tight"
            >
              {value}
            </motion.span>
            {unit && <span className="text-xs font-medium text-gray-500 mb-1">{unit}</span>}
          </div>
          
          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="w-20 h-8 opacity-70 group-hover:opacity-100 transition-opacity">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <YAxis domain={['auto', 'auto']} hide />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke={isPositive ? '#10b981' : '#ef4444'} 
                    strokeWidth={2} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
