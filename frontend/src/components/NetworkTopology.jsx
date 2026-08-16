import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import { AnimatePresence } from 'framer-motion';
import { LayoutTemplate, Shuffle, Globe } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import useNodeInspection from '../hooks/useNodeInspection';
import NodeInspectionPanel from './NodeInspectionPanel';
import useNetworkLayout from '../hooks/useNetworkLayout';
import useGeoIPCache from '../hooks/useGeoIPCache';
import useEdgeWeights from '../hooks/useEdgeWeights';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import PerformanceMonitor from './PerformanceMonitor';

const nodeTypes = {
  custom: CustomNode,
};
const edgeTypes = {
  customEdge: CustomEdge,
};

export default function NetworkTopology({ packets, alerts }) {
  const { selectedNodeId, setSelectedNodeId, nodeData } = useNodeInspection(packets, alerts);
  
  const [useHierarchical, setUseHierarchical] = useState(() => {
    const saved = localStorage.getItem('netmon_layout_pref');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [useGeo, setUseGeo] = useState(() => {
    const saved = localStorage.getItem('netmon_geo_pref');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const { geoData, resolveIPs } = useGeoIPCache(useGeo);
  const weightedEdges = useEdgeWeights(packets);

  const handleToggleLayout = useCallback((val) => {
    setUseHierarchical(val);
    localStorage.setItem('netmon_layout_pref', JSON.stringify(val));
  }, []);

  const handleToggleGeo = useCallback(() => {
    setUseGeo(prev => {
      const next = !prev;
      localStorage.setItem('netmon_geo_pref', JSON.stringify(next));
      return next;
    });
  }, []);

  // Throttle graph generation to avoid continuous layout recalculation
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000); 
    return () => clearInterval(interval);
  }, []);

  // Build base graph data (Runs once every 10s to capture new IPs)
  const rawGraphData = useMemo(() => {
    const nodesMap = new Map();
    
    const threatIps = new Set();
    alerts.forEach(a => {
      const match = a.description.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);
      if (match) threatIps.add(match[0]);
    });

    const uniqueIps = new Set();
    
    const addNode = (ip) => {
      // Hard limit to 100 nodes for extreme performance
      if (nodesMap.size >= 100) return;

      uniqueIps.add(ip);
      if (!nodesMap.has(ip)) {
        let bgColor = '#1e293b'; 
        let borderColor = '#3b82f6'; 
        
        if (threatIps.has(ip)) {
          borderColor = '#ef4444'; 
          bgColor = '#ef444422';
        } else if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
          borderColor = '#10b981'; 
        }

        nodesMap.set(ip, {
          id: ip,
          position: { x: Math.random() * 800, y: Math.random() * 600 },
          type: 'custom',
          data: { 
            label: ip,
            geo: useGeo ? geoData[ip] : null,
            style: { 
              background: bgColor,
              color: '#e2e8f0', 
              border: `2px solid ${borderColor}`,
              borderRadius: '8px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '12px',
              boxShadow: `0 0 10px ${borderColor}44`,
            }
          },
        });
      }
    };

    weightedEdges.forEach(edge => {
      addNode(edge.source);
      addNode(edge.target);
    });

    resolveIPs(Array.from(uniqueIps));

    return {
      nodes: Array.from(nodesMap.values()),
      edges: weightedEdges,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, geoData, useGeo]); // Intentionally removed weightedEdges to throttle node generation to 10s

  // Pass raw nodes and LIVE weightedEdges into ELK layout engine
  const { layoutedNodes, layoutedEdges, isComputing } = useNetworkLayout(
    rawGraphData.nodes, 
    weightedEdges, 
    useHierarchical
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // When ELK finishes computing, update ReactFlow states
  useEffect(() => {
    // If we have > 100 nodes, strip CSS transitions to save layout trashing CPU overhead
    const highLoad = layoutedNodes.length > 100;
    
    const nodesWithTransitions = layoutedNodes.map(n => ({
      ...n,
      className: highLoad ? '' : 'transition-all duration-300 ease-out'
    }));
    
    setNodes(nodesWithTransitions);
    
    // Also disable edge animation if high load
    const optEdges = layoutedEdges.map(e => ({
      ...e,
      data: {
        ...e.data,
        animDuration: highLoad ? 0 : e.data.animDuration
      }
    }));
    setEdges(optEdges);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  return (
    <div className="w-full h-[600px] glass-panel overflow-hidden border border-dark-border relative">
      
      {/* Overlay Toolbar */}
      <div className="absolute z-10 top-4 left-4 pointer-events-none flex flex-col gap-1">
        <h2 className="text-lg font-bold text-gray-200">Network Topology Map</h2>
        <p className="text-xs text-gray-400 mb-2">Live active connections. Click any node to inspect.</p>
        
        <div className="pointer-events-auto flex items-center gap-2 mb-1">
          <div className="inline-flex items-center gap-1 bg-dark-card border border-dark-border p-1 rounded-lg">
            <button
              onClick={() => handleToggleLayout(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                useHierarchical ? 'bg-primary-blue text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Hierarchical
            </button>
            <button
              onClick={() => handleToggleLayout(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                !useHierarchical ? 'bg-primary-blue text-white shadow' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5" />
              Force-Directed
            </button>
          </div>

          <button
            onClick={handleToggleGeo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
              useGeo ? 'bg-severity-medium/20 text-severity-medium border-severity-medium/50' : 'bg-dark-card border-dark-border text-gray-500 hover:text-gray-300'
            }`}
            title="Toggle IP Geolocation Lookup"
          >
            <Globe className="w-4 h-4" />
            {useGeo ? 'Geo ON' : 'Geo OFF'}
          </button>
        </div>
        
        {isComputing && (
          <span className="text-xs text-primary-blue animate-pulse mt-1 bg-dark-base/80 px-2 py-1 rounded inline-block self-start">
            Computing layout...
          </span>
        )}
      </div>
      
      {/* HUD Monitors */}
      <PerformanceMonitor nodeCount={nodes.length} edgeCount={edges.length} />

      {/* Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        attributionPosition="bottom-right"
        className="bg-[#0b1120]"
      >
        <Background color="#334155" gap={16} size={1} />
        <Controls className="bg-dark-card border-dark-border fill-white" />
      </ReactFlow>

      {/* Slide-in Inspection Panel */}
      <AnimatePresence>
        {selectedNodeId && (
          <NodeInspectionPanel 
            data={nodeData} 
            onClose={() => setSelectedNodeId(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
