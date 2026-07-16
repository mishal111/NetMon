import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import { AnimatePresence } from 'framer-motion';
import { LayoutTemplate, Shuffle, Globe } from 'lucide-react';
import '@xyflow/react/dist/style.css';

import useNodeInspection from '../hooks/useNodeInspection';
import NodeInspectionPanel from './NodeInspectionPanel';
import useNetworkLayout from '../hooks/useNetworkLayout';
import useGeoIPCache from '../hooks/useGeoIPCache';
import CustomNode from './CustomNode';

const nodeTypes = {
  custom: CustomNode,
};

export default function NetworkTopology({ packets, alerts }) {
  const { selectedNodeId, setSelectedNodeId, nodeData } = useNodeInspection(packets, alerts);
  
  // Layout Toggle State (Persisted)
  const [useHierarchical, setUseHierarchical] = useState(() => {
    const saved = localStorage.getItem('netmon_layout_pref');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // GeoLocation Toggle State (Persisted)
  const [useGeo, setUseGeo] = useState(() => {
    const saved = localStorage.getItem('netmon_geo_pref');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const { geoData, resolveIPs } = useGeoIPCache(useGeo);

  const handleToggleLayout = (val) => {
    setUseHierarchical(val);
    localStorage.setItem('netmon_layout_pref', JSON.stringify(val));
  };

  const handleToggleGeo = () => {
    setUseGeo(prev => {
      const next = !prev;
      localStorage.setItem('netmon_geo_pref', JSON.stringify(next));
      return next;
    });
  };

  // Throttle graph generation to avoid continuous layout recalculation
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000); // 10s
    return () => clearInterval(interval);
  }, []);

  // Build base graph data (Runs once every 10s to capture new IPs)
  const rawGraphData = useMemo(() => {
    const nodesMap = new Map();
    const edgesMap = new Map();
    
    const threatIps = new Set();
    alerts.forEach(a => {
      const match = a.description.match(/(?:[0-9]{1,3}\.){3}[0-9]{1,3}/);
      if (match) threatIps.add(match[0]);
    });

    // Use last 100 packets to get a good snapshot
    const recentPackets = packets.slice(0, 100);
    const uniqueIps = new Set();
    
    const addNode = (ip) => {
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
          type: 'custom', // Use CustomNode
          data: { 
            label: ip,
            geo: useGeo ? geoData[ip] : null, // Attach cached geo if available
            style: { // Pass styles down to custom node
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

    recentPackets.forEach((pkt) => {
      if (!pkt.src_ip || !pkt.dst_ip) return;
      
      addNode(pkt.src_ip);
      addNode(pkt.dst_ip);

      const edgeId = `${pkt.src_ip}-${pkt.dst_ip}`;
      if (!edgesMap.has(edgeId)) {
        edgesMap.set(edgeId, {
          id: edgeId,
          source: pkt.src_ip,
          target: pkt.dst_ip,
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          label: pkt.protocol === 6 ? 'TCP' : pkt.protocol === 17 ? 'UDP' : 'ICMP',
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: '#1e293b' }
        });
      }
    });

    // Fire off async geo lookups for any new IPs found
    resolveIPs(Array.from(uniqueIps));

    return {
      nodes: Array.from(nodesMap.values()),
      edges: Array.from(edgesMap.values()),
    };
    // We intentionally include geoData as a dependency so nodes re-render when geo fetching completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, geoData, useGeo]); 

  // Pass raw nodes into ELK layout engine
  const { layoutedNodes, layoutedEdges, isComputing } = useNetworkLayout(
    rawGraphData.nodes, 
    rawGraphData.edges, 
    useHierarchical
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // When ELK finishes computing, update ReactFlow states
  useEffect(() => {
    // Add animate class for smooth sliding transitions
    const nodesWithTransitions = layoutedNodes.map(n => ({
      ...n,
      className: 'transition-all duration-300 ease-out'
    }));
    
    setNodes(nodesWithTransitions);
    setEdges(layoutedEdges);
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
      
      {/* Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
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
