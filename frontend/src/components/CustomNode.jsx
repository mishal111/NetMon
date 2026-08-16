import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

export default memo(function CustomNode({ data, selected }) {
  // Extract custom style passed through data.style for consistency
  const style = data.style || {};
  
  return (
    <div 
      className={`relative group ${selected ? 'ring-2 ring-primary-blue ring-offset-2 ring-offset-dark-base' : ''} transition-all duration-200`}
      style={{
        background: style.background || '#1e293b',
        color: style.color || '#e2e8f0',
        border: style.border || '2px solid #3b82f6',
        borderRadius: style.borderRadius || '8px',
        padding: style.padding || '10px',
        fontFamily: style.fontFamily || 'monospace',
        fontSize: style.fontSize || '12px',
        boxShadow: style.boxShadow || 'none',
        minWidth: '150px',
      }}
      title={data.geo ? `${data.geo.city ? data.geo.city + ', ' : ''}${data.geo.country}` : data.label}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold tracking-wide truncate">{data.label}</span>
        {data.geo && (
          <div className="flex items-center gap-1.5 shrink-0 bg-black/20 px-1.5 py-0.5 rounded border border-white/10">
            <span className="text-sm leading-none" role="img" aria-label="flag">{data.geo.flag}</span>
            <span className="text-[10px] font-bold text-gray-400">{data.geo.countryCode}</span>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
});
