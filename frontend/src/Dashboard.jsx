import React, { useState, useEffect } from 'react';
import { Network, Activity, Globe, ShieldAlert, Cpu, Zap } from 'lucide-react';
import Header from './components/Header';
import KPICard from './components/KPICard';
import NetworkTrafficChart from './components/NetworkTrafficChart';
import LivePacketStream from './components/LivePacketStream';
import AlertPanel from './components/AlertPanel';

export default function Dashboard() {
  const [trafficData, setTrafficData] = useState([]);
  const [packets, setPackets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  
  // KPI States
  const [kpiData, setKpiData] = useState({
    pps: { value: 0, trend: 0, history: [] },
    bandwidth: { value: '0', trend: 0, history: [] },
    activeIps: { value: 0, trend: 0, history: [] },
    topProto: 'N/A',
    topPort: 'N/A',
  });

  const API_BASE = 'http://localhost:8001';
  const WS_URL = 'ws://localhost:8001/ws/packets';

  const fetchInitialData = async () => {
    try {
      // Fetch initial alerts
      const alertsRes = await fetch(`${API_BASE}/alerts`);
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.alerts || []);

      // Fetch initial packets
      const packetsRes = await fetch(`${API_BASE}/packets?limit=50`);
      const packetsData = await packetsRes.json();
      setPackets(packetsData.packets || []);
      
      await fetchMetrics();
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchMetrics = async () => {
    try {
      // Traffic
      const trafficRes = await fetch(`${API_BASE}/metrics/traffic-last-hour`);
      const trafficJson = await trafficRes.json();
      const points = trafficJson.points || [];
      setTrafficData(points);
      
      // Top IPs
      const ipsRes = await fetch(`${API_BASE}/metrics/top-ips-realtime`);
      const ipsJson = await ipsRes.json();
      
      // Top Ports
      const portsRes = await fetch(`${API_BASE}/metrics/top-ports-realtime`);
      const portsJson = await portsRes.json();
      
      // Protocols
      const protoRes = await fetch(`${API_BASE}/metrics/protocols-last-hour`);
      const protoJson = await protoRes.json();

      // Calculate KPIs
      if (points.length > 0) {
        const latest = points[points.length - 1];
        const pps = Math.round((latest.packets || 0) / 10); // 10s window avg
        const bps = ((latest.bytes || 0) / 10) * 8; // bits per second
        let bandwidthStr = `${bps.toFixed(0)} bps`;
        if (bps > 1000000) bandwidthStr = `${(bps / 1000000).toFixed(1)} Mbps`;
        else if (bps > 1000) bandwidthStr = `${(bps / 1000).toFixed(1)} Kbps`;
        
        // Generate sparkline from history
        const ppsHistory = points.slice(-10).map(p => ({ value: (p.packets || 0) / 10 }));
        const bwHistory = points.slice(-10).map(p => ({ value: (p.bytes || 0) }));

        setKpiData(prev => ({
          ...prev,
          pps: { value: pps, trend: 0, history: ppsHistory },
          bandwidth: { value: bandwidthStr, trend: 0, history: bwHistory },
          activeIps: { value: (ipsJson.ips || []).length * 4, trend: 0, history: [] }, // *4 just to simulate network size
          topProto: protoJson.protocols?.length > 0 ? protoJson.protocols[0].protocol : 'N/A',
          topPort: portsJson.ports?.length > 0 ? portsJson.ports[0].port : 'N/A'
        }));
      }
    } catch (error) {
      console.error("Error fetching metrics:", error);
    }
  };

  useEffect(() => {
    fetchInitialData();

    // Setup WebSocket
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_packet') {
          setPackets(prev => [data.packet, ...prev].slice(0, 50)); 
        } else if (data.type === 'new_alert') {
          setAlerts(prev => [data.alert, ...prev].slice(0, 50));
        }
      } catch (err) {
        console.error("WebSocket error:", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    const interval = setInterval(fetchMetrics, 10000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark-base text-gray-200 p-4 md:p-6 flex flex-col font-sans">
      
      <Header connected={connected} />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard 
          title="Traffic Rate" 
          value={kpiData.pps.value} 
          unit="PPS"
          trend={2} 
          trendDirection="up"
          icon={Activity} 
          sparklineData={kpiData.pps.history}
          colorClass="text-primary-blue"
        />
        <KPICard 
          title="Bandwidth" 
          value={kpiData.bandwidth.value} 
          trend={5} 
          trendDirection="up"
          icon={Zap} 
          sparklineData={kpiData.bandwidth.history}
          colorClass="text-severity-success"
        />
        <KPICard 
          title="Active Nodes" 
          value={kpiData.activeIps.value} 
          icon={Network} 
          colorClass="text-severity-medium"
        />
        <KPICard 
          title="Total Alerts" 
          value={alerts.length} 
          trend={alerts.length > 10 ? 12 : 0} 
          trendDirection={alerts.length > 10 ? 'down' : 'up'}
          icon={ShieldAlert} 
          colorClass="text-severity-critical"
        />
        <KPICard 
          title="Top Protocol" 
          value={kpiData.topProto} 
          icon={Globe} 
          colorClass="text-primary-blue"
        />
        <KPICard 
          title="Primary Port" 
          value={kpiData.topPort} 
          icon={Cpu} 
          colorClass="text-primary-blue"
        />
      </div>

      {/* Main Layout Grid */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        
        {/* Left Column (Spans 9 cols on large screens) */}
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-6 min-h-0">
          
          <div className="h-72 shrink-0">
            <NetworkTrafficChart data={trafficData} />
          </div>
          
          <div className="flex-1 min-h-[300px]">
            <LivePacketStream packets={packets} />
          </div>

        </div>

        {/* Right Column - Alerts (Spans 3 cols) */}
        <div className="col-span-12 xl:col-span-3 h-full min-h-[500px]">
          <AlertPanel alerts={alerts} />
        </div>
      </div>
    </div>
  );
}
