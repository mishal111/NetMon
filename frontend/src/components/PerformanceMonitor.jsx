import React from 'react';
import usePerformanceMonitor from '../hooks/usePerformanceMonitor';
import { Activity } from 'lucide-react';

export default function PerformanceMonitor({ nodeCount, edgeCount }) {
  const fps = usePerformanceMonitor();
  
  let fpsColor = 'text-severity-success';
  if (fps < 30) fpsColor = 'text-severity-critical';
  else if (fps < 50) fpsColor = 'text-severity-medium';

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none bg-dark-card border border-dark-border px-3 py-2 rounded-lg shadow-lg flex items-center gap-4 text-xs font-mono font-bold tracking-wide">
      <div className="flex items-center gap-1.5 text-gray-400">
        <Activity className="w-3.5 h-3.5 text-primary-blue" />
        <span className={fpsColor}>{fps} FPS</span>
      </div>
      <div className="w-px h-4 bg-dark-border" />
      <div className="flex items-center gap-3 text-gray-400">
        <span>Nodes: <span className="text-gray-200">{nodeCount}</span></span>
        <span>Edges: <span className="text-gray-200">{edgeCount}</span></span>
      </div>
    </div>
  );
}
