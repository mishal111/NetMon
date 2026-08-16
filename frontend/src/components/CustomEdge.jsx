import React, { memo } from 'react';
import { getBezierPath } from '@xyflow/react';

export default memo(function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Pulse animation CSS is native to React Flow's "animated" edges, 
  // but we build it manually here to control the duration precisely.
  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          strokeWidth: data.strokeWidth || 1,
          stroke: '#3b82f6',
          opacity: data.opacity || 0.3,
          strokeDasharray: 5,
          animation: `dashdraw ${data.animDuration || 1}s linear infinite`,
          fill: 'none',
        }}
      />
      {/* Invisible thicker path for easier hover/tooltip targeting */}
      <path
        d={edgePath}
        style={{ strokeWidth: 20, stroke: 'transparent', fill: 'none', cursor: 'pointer' }}
        title={data.tooltip}
        className="hover:stroke-primary-blue/20 transition-colors"
      />
      
      {/* Native CSS for the dashdraw animation */}
      <style>
        {`
          @keyframes dashdraw {
            from { stroke-dashoffset: 10; }
            to { stroke-dashoffset: 0; }
          }
        `}
      </style>
    </>
  );
});
