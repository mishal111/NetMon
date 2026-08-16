import { useState, useEffect } from 'react';

export default function useEdgeWeights(packets) {
  const [edgeData, setEdgeData] = useState([]);

  useEffect(() => {
    const aggregateTraffic = () => {
      if (!packets || packets.length === 0) return;

      const connectionMap = new Map();

      // Aggregate all packets
      packets.forEach(pkt => {
        if (!pkt.src_ip || !pkt.dst_ip) return;
        
        const edgeId = `${pkt.src_ip}-${pkt.dst_ip}`;
        
        if (!connectionMap.has(edgeId)) {
          connectionMap.set(edgeId, {
            id: edgeId,
            source: pkt.src_ip,
            target: pkt.dst_ip,
            packetCount: 0,
            totalBytes: 0,
            protocol: pkt.protocol === 6 ? 'TCP' : pkt.protocol === 17 ? 'UDP' : 'ICMP'
          });
        }
        
        const conn = connectionMap.get(edgeId);
        conn.packetCount += 1;
        conn.totalBytes += (pkt.size || 0);
      });

      // Filter and sort
      let edges = Array.from(connectionMap.values())
        .filter(conn => conn.packetCount >= 3)
        .sort((a, b) => b.totalBytes - a.totalBytes)
        .slice(0, 50);

      // Determine min/max for normalization
      const maxPackets = Math.max(...edges.map(e => e.packetCount), 1);
      const minPackets = Math.min(...edges.map(e => e.packetCount), 1);

      // Normalize and format for React Flow
      const layoutedEdges = edges.map(edge => {
        // Normalize stroke 1-5px
        let strokeWidth = 1;
        if (maxPackets > minPackets) {
          strokeWidth = 1 + (4 * ((edge.packetCount - minPackets) / (maxPackets - minPackets)));
        } else {
          strokeWidth = 3;
        }

        // Opacity tiers
        let opacity = 0.3;
        if (edge.totalBytes > 102400) opacity = 1.0;
        else if (edge.totalBytes > 1024) opacity = 0.6;
        
        // Faster animation for heavier traffic
        const animDuration = Math.max(0.5, 2.5 - strokeWidth * 0.4);

        // Tooltip string
        const kb = (edge.totalBytes / 1024).toFixed(1);
        const tooltip = `${edge.packetCount} packets • ${kb} KB • ${edge.protocol}`;

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'customEdge',
          data: {
            tooltip,
            strokeWidth,
            opacity,
            animDuration
          }
        };
      });

      setEdgeData(layoutedEdges);
    };

    // Run immediately, then every 5s
    aggregateTraffic();
    const interval = setInterval(aggregateTraffic, 5000);
    
    return () => clearInterval(interval);
  }, [packets]);

  return edgeData;
}
