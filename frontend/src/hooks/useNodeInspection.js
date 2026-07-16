import { useState, useMemo } from 'react';

export default function useNodeInspection(packets, alerts) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const nodeData = useMemo(() => {
    if (!selectedNodeId) return null;

    const ip = selectedNodeId;

    // Filter relevant packets
    const relatedPackets = packets.filter(p => p.src_ip === ip || p.dst_ip === ip);
    
    // Stats
    let sent = 0;
    let received = 0;
    let totalBytes = 0;
    let tcpCount = 0;
    let udpCount = 0;
    let icmpCount = 0;
    
    const portFreq = {};

    relatedPackets.forEach(p => {
      totalBytes += (p.size || 0);
      
      if (p.src_ip === ip) {
        sent++;
        // Track destination ports for outbound traffic
        if (p.port) {
          portFreq[p.port] = (portFreq[p.port] || 0) + 1;
        }
      } else {
        received++;
      }

      if (p.protocol === 6) tcpCount++;
      else if (p.protocol === 17) udpCount++;
      else if (p.protocol === 1) icmpCount++;
    });

    // Top Ports
    const topPorts = Object.entries(portFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([port, count]) => ({ port, count }));

    // Related Alerts
    const relatedAlerts = alerts.filter(a => a.description.includes(ip));

    // Classification
    let classification = 'External Device';
    if (relatedAlerts.length > 0) {
      classification = 'Threat Detected';
    } else if (ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.')) {
      classification = 'Internal Network';
    }

    return {
      ip,
      classification,
      stats: { sent, received, totalBytes },
      protocols: { tcp: tcpCount, udp: udpCount, icmp: icmpCount },
      topPorts,
      recentPackets: relatedPackets.slice(0, 10),
      relatedAlerts
    };
  }, [selectedNodeId, packets, alerts]);

  return {
    selectedNodeId,
    setSelectedNodeId,
    nodeData
  };
}
