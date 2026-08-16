import React, { useState, useEffect } from 'react';
import { Database, Play, Square, Download, HardDrive, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

export default function ForensicsPanel() {
  const { isRecording, setIsRecording } = useStore();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = 'http://localhost:8001/api/forensics';

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`${API_BASE}/recordings`);
      const data = await res.json();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error("Error fetching recordings:", error);
    }
  };

  useEffect(() => {
    fetchRecordings();
    
    // Check if currently recording (could be a backend state, but we'll mock the UI toggle for now, 
    // ideally the backend would return current state in a /status endpoint)
    // For simplicity, we just assume it's off on load.
  }, []);

  const toggleRecording = async () => {
    setLoading(true);
    try {
      if (isRecording) {
        await fetch(`${API_BASE}/record/stop`, { method: 'POST' });
        setIsRecording(false);
        // Refresh the list to show the newly saved file
        await fetchRecordings();
      } else {
        await fetch(`${API_BASE}/record/start`, { method: 'POST' });
        setIsRecording(true);
      }
    } catch (error) {
      console.error("Error toggling recording:", error);
    }
    setLoading(false);
  };

  const replayRecording = async (filename) => {
    try {
      await fetch(`${API_BASE}/replay/${filename}`, { method: 'POST' });
      alert(`Started replaying ${filename}! Switch to the Analytics tab to watch the packets.`);
    } catch (error) {
      console.error("Error replaying:", error);
      alert("Failed to start replay.");
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-6 h-full text-gray-200">
      <div className="glass-panel p-6 border border-dark-border flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary-blue" />
            PCAP Forensics & Recording
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Record raw network packets directly to disk for historical playback and deep forensic analysis.
          </p>
        </div>
        
        <button
          onClick={toggleRecording}
          disabled={loading}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold shadow-lg transition-all ${
            isRecording 
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' 
              : 'bg-primary-blue text-white hover:bg-blue-600'
          }`}
        >
          {loading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : isRecording ? (
            <>
              <Square className="w-5 h-5 fill-current" /> Stop Recording
            </>
          ) : (
            <>
              <Database className="w-5 h-5" /> Start Capture
            </>
          )}
        </button>
      </div>

      <div className="glass-panel border border-dark-border flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-dark-border flex justify-between items-center bg-dark-card/50">
          <h3 className="font-semibold">Saved Captures (.pcap)</h3>
          <button onClick={fetchRecordings} className="text-gray-400 hover:text-white p-1 rounded transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {recordings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Database className="w-12 h-12 mb-3 opacity-20" />
              <p>No PCAP recordings found.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {recordings.map((rec) => (
                <div key={rec.filename} className="bg-dark-card border border-dark-border p-4 rounded-lg flex items-center justify-between group hover:border-primary-blue/50 transition-colors">
                  <div className="flex flex-col">
                    <span className="font-mono text-sm text-primary-blue">{rec.filename}</span>
                    <span className="text-xs text-gray-400 mt-1">
                      {new Date(rec.created_at).toLocaleString()} • {formatBytes(rec.size_bytes)}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => replayRecording(rec.filename)}
                      className="p-2 rounded bg-severity-success/20 text-severity-success hover:bg-severity-success/30 flex items-center gap-1 text-sm font-semibold transition-colors"
                      title="Inject packets back into live dashboard"
                    >
                      <Play className="w-4 h-4 fill-current" /> Replay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
