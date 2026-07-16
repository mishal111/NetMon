import React, { useState, useEffect } from 'react';
import { Network, Activity, Globe, ShieldAlert, Cpu, Zap, Settings, AlertTriangle } from 'lucide-react';
import useStore from './store/useStore';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICard from './components/KPICard';
import NetworkTrafficChart from './components/NetworkTrafficChart';
import LivePacketStream from './components/LivePacketStream';
import AlertPanel from './components/AlertPanel';
import AdvancedSearch from './components/AdvancedSearch';
import NetworkTopology from './components/NetworkTopology';
import ThreatTimeline from './components/ThreatTimeline';
import AlertSettings from './components/AlertSettings';

export default function Dashboard() {
  const { activeView } = useStore();
  
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
      const alertsRes = await fetch(`${API_BASE}/alerts`);
      const alertsData = await alertsRes.json();
      setAlerts(alertsData.alerts || []);

      const packetsRes = await fetch(`${API_BASE}/packets?limit=200`); 
      const packetsData = await packetsRes.json();
      setPackets(packetsData.packets || []);
      
      await fetchMetrics();
    } catch (error) {
      console.error("Error fetching initial data:", error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const trafficRes = await fetch(`${API_BASE}/metrics/traffic-last-hour`);
      const trafficJson = await trafficRes.json();
      const points = trafficJson.points || [];
      setTrafficData(points);
      
      const ipsRes = await fetch(`${API_BASE}/metrics/top-ips-realtime`);
      const ipsJson = await ipsRes.json();
      
      const portsRes = await fetch(`${API_BASE}/metrics/top-ports-realtime`);
      const portsJson = await portsRes.json();
      
      const protoRes = await fetch(`${API_BASE}/metrics/protocols-last-hour`);
      const protoJson = await protoRes.json();

      if (points.length > 0) {
        const latest = points[points.length - 1];
        const pps = Math.round((latest.packets || 0) / 10);
        const bps = ((latest.bytes || 0) / 10) * 8;
        let bandwidthStr = `${bps.toFixed(0)} bps`;
        if (bps > 1000000) bandwidthStr = `${(bps / 1000000).toFixed(1)} Mbps`;
        else if (bps > 1000) bandwidthStr = `${(bps / 1000).toFixed(1)} Kbps`;
        
        const ppsHistory = points.slice(-10).map(p => ({ value: (p.packets || 0) / 10 }));
        const bwHistory = points.slice(-10).map(p => ({ value: (p.bytes || 0) }));

        setKpiData(prev => ({
          ...prev,
          pps: { value: pps, trend: 0, history: ppsHistory },
          bandwidth: { value: bandwidthStr, trend: 0, history: bwHistory },
          activeIps: { value: (ipsJson.ips || []).length * 4, trend: 0, history: [] },
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

    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_packet') {
          setPackets(prev => [data.packet, ...prev].slice(0, 200)); 
        } else if (data.type === 'new_alert') {
          setAlerts(prev => [data.alert, ...prev].slice(0, 100));
        }
      } catch (err) {
        console.error("WebSocket error:", err);
      }
    };

    ws.onclose = () => setConnected(false);

    const interval = setInterval(fetchMetrics, 10000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  // --- View Renderers ---

  const renderOverview = () => (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <KPICard title="Traffic Rate" value={kpiData.pps.value} unit="PPS" trend={2} trendDirection="up" icon={Activity} sparklineData={kpiData.pps.history} colorClass="text-primary-blue" />
        <KPICard title="Bandwidth" value={kpiData.bandwidth.value} trend={5} trendDirection="up" icon={Zap} sparklineData={kpiData.bandwidth.history} colorClass="text-severity-success" />
        <KPICard title="Active Nodes" value={kpiData.activeIps.value} icon={Network} colorClass="text-severity-medium" />
        <KPICard title="Total Alerts" value={alerts.length} trend={alerts.length > 10 ? 12 : 0} trendDirection={alerts.length > 10 ? 'down' : 'up'} icon={ShieldAlert} colorClass="text-severity-critical" />
        <KPICard title="Top Protocol" value={kpiData.topProto} icon={Globe} colorClass="text-primary-blue" />
        <KPICard title="Primary Port" value={kpiData.topPort} icon={Cpu} colorClass="text-primary-blue" />
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 pb-6">
        <div className="col-span-12 xl:col-span-9 flex flex-col gap-6 min-h-0">
          <div className="h-72 shrink-0">
            <NetworkTrafficChart data={trafficData} />
          </div>
          <div className="flex-1 min-h-[300px]">
            <LivePacketStream packets={packets} />
          </div>
        </div>
        <div className="col-span-12 xl:col-span-3 h-full min-h-[500px]">
          <AlertPanel alerts={alerts} />
        </div>
      </div>
    </>
  );

  const renderPackets = () => (
    <div className="flex flex-col h-full min-h-0 pb-6">
      <AdvancedSearch />
      <div className="flex-1 min-h-0">
        <LivePacketStream packets={packets} />
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="flex flex-col h-full min-h-0 pb-6 gap-6">
      <NetworkTopology packets={packets} alerts={alerts} />
      <div className="h-72 shrink-0">
        <NetworkTrafficChart data={trafficData} />
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="flex flex-col h-full min-h-0 pb-6">
      <ThreatTimeline alerts={alerts} />
    </div>
  );

  const renderSettings = () => (
    <div className="flex flex-col h-full min-h-0 pb-6 overflow-y-auto">
      <AlertSettings />
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'overview': return renderOverview();
      case 'packets': return renderPackets();
      case 'analytics': return renderAnalytics();
      case 'alerts': return renderAlerts();
      case 'settings': return renderSettings();
      default: return renderOverview();
    }
  };

  return (
    <div className="flex h-screen bg-dark-base text-gray-200 font-sans overflow-hidden selection:bg-primary-blue selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div id="dashboard-main-content" className="flex-1 flex flex-col p-4 md:px-8 md:py-6 overflow-y-auto overflow-x-hidden relative h-full custom-scrollbar">
        <Header connected={connected} packets={packets} alerts={alerts} />
        {renderContent()}
      </div>
    </div>
  );
}
