import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-dark-base border border-dark-border p-3 rounded-lg shadow-xl">
        <p className="text-gray-400 text-xs mb-1 font-mono">{label}</p>
        <p className="text-primary-blue font-semibold text-sm">
          {payload[0].value.toLocaleString()} Packets
        </p>
      </div>
    );
  }
  return null;
};

export default function NetworkTrafficChart({ data }) {
  // Format data for chart
  const chartData = data.map(pt => ({
    time: new Date(pt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    packets: pt.packets || 0
  }));

  return (
    <div className="glass-panel p-5 flex flex-col h-full glow-primary">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-primary-blue w-5 h-5" />
          <h2 className="text-lg font-semibold text-gray-200">Real-time Traffic Overview</h2>
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-blue animate-pulse"></span>
          Live Ingestion
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[200px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPackets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                minTickGap={20}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="packets" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPackets)" 
                isAnimationActive={false} // Improves perf for real-time
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-sm">Awaiting Network Telemetry...</span>
          </div>
        )}
      </div>
    </div>
  );
}
