import { useState, useEffect, useRef } from 'react';
import useStore from '../store/useStore';

export default function useWebSocketOptimized(url, initialPackets = [], initialAlerts = []) {
  const [packets, setPackets] = useState(initialPackets);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [connected, setConnected] = useState(false);
  
  const packetBuffer = useRef([]);
  const alertBuffer = useRef([]);

  useEffect(() => {
    // If we receive initial data props later, we want to respect them if our current state is empty
    if (initialPackets.length > 0 && packets.length === 0) setPackets(initialPackets);
    if (initialAlerts.length > 0 && alerts.length === 0) setAlerts(initialAlerts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPackets, initialAlerts]);

  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => setConnected(true);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'new_packet') {
          packetBuffer.current.push(data.packet);
        } else if (data.type === 'new_alert') {
          alertBuffer.current.push(data.alert);
        } else if (data.type === 'replay_start') {
          useStore.getState().setReplayStatus({ active: true, filename: data.filename });
          useStore.getState().setReplayProgress({ current: 0, total: data.total, status: 'playing' });
        } else if (data.type === 'replay_end') {
          useStore.getState().setReplayStatus({ active: false, filename: null });
          useStore.getState().setReplayProgress({ current: 0, total: 0, status: 'stopped' });
        } else if (data.type === 'replay_progress') {
          useStore.getState().setReplayProgress({ current: data.current, total: data.total, status: data.status });
        }
      } catch (err) {
        console.error("WebSocket error:", err);
      }
    };

    ws.onclose = () => setConnected(false);

    // Batch processor interval
    const batchInterval = setInterval(() => {
      if (packetBuffer.current.length > 0) {
        setPackets(prev => {
          // Keep only the last 1000 packets to prevent massive memory leaks
          const next = [...packetBuffer.current, ...prev].slice(0, 1000);
          // Also purge packets older than 10 minutes
          const tenMinsAgo = Date.now() - 10 * 60 * 1000;
          return next.filter(p => new Date(p.timestamp).getTime() > tenMinsAgo);
        });
        packetBuffer.current = [];
      }

      if (alertBuffer.current.length > 0) {
        setAlerts(prev => {
          const next = [...alertBuffer.current, ...prev].slice(0, 500);
          return next;
        });
        alertBuffer.current = [];
      }
    }, 200); // 200ms batch flush

    return () => {
      ws.close();
      clearInterval(batchInterval);
    };
  }, [url]);

  return { packets, alerts, connected };
}
