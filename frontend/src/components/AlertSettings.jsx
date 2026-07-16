import React, { useState } from 'react';
import { Settings2, Save, RotateCcw, AlertOctagon } from 'lucide-react';

export default function AlertSettings() {
  const defaultSettings = {
    ddosPps: 500,
    portScanPorts: 20,
    bruteForceAttempts: 10,
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Basic validation: only allow positive numbers
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0)) {
      setSettings(prev => ({ ...prev, [name]: value === '' ? '' : parseInt(value) }));
      setSaved(false);
    }
  };

  const handleSave = () => {
    // In a real application, this would POST to the FastAPI backend to update detector.py config
    console.log("Saving new thresholds:", settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setSaved(false);
  };

  return (
    <div className="max-w-2xl mx-auto glass-panel p-8">
      <div className="flex items-center gap-3 mb-6 border-b border-dark-border pb-4">
        <Settings2 className="w-6 h-6 text-gray-300" />
        <h2 className="text-xl font-bold text-gray-200">Detection Thresholds</h2>
      </div>

      <div className="bg-severity-high/10 border border-severity-high/30 rounded-lg p-4 mb-8 flex gap-3">
        <AlertOctagon className="w-5 h-5 text-severity-high shrink-0 mt-0.5" />
        <p className="text-sm text-gray-300">
          Adjusting these thresholds affects the sensitivity of the underlying SOC analytics engine. 
          Setting values too low may result in alert fatigue (false positives).
        </p>
      </div>

      <div className="space-y-6">
        {/* DDoS Threshold */}
        <div className="bg-dark-base border border-dark-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold text-gray-200">Volumetric Attack (DDoS)</label>
            <span className="text-xs font-mono text-gray-500 bg-dark-card px-2 py-1 rounded">Packets / Second</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Triggers a HIGH severity alert if traffic exceeds this rate.</p>
          <input 
            type="number" 
            name="ddosPps"
            value={settings.ddosPps}
            onChange={handleChange}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-2 text-white focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue transition-colors font-mono"
          />
        </div>

        {/* Port Scan Threshold */}
        <div className="bg-dark-base border border-dark-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold text-gray-200">Network Reconnaissance (Port Scan)</label>
            <span className="text-xs font-mono text-gray-500 bg-dark-card px-2 py-1 rounded">Distinct Ports / Minute</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Triggers a MEDIUM severity alert if a single IP scans this many distinct ports.</p>
          <input 
            type="number" 
            name="portScanPorts"
            value={settings.portScanPorts}
            onChange={handleChange}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-2 text-white focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue transition-colors font-mono"
          />
        </div>

        {/* Brute Force Threshold */}
        <div className="bg-dark-base border border-dark-border rounded-xl p-5">
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold text-gray-200">Authentication Brute Force</label>
            <span className="text-xs font-mono text-gray-500 bg-dark-card px-2 py-1 rounded">Attempts / Minute</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">Triggers a CRITICAL severity alert upon repeated connection failures.</p>
          <input 
            type="number" 
            name="bruteForceAttempts"
            value={settings.bruteForceAttempts}
            onChange={handleChange}
            className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-2 text-white focus:border-primary-blue focus:outline-none focus:ring-1 focus:ring-primary-blue transition-colors font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-8 pt-6 border-t border-dark-border">
        <button 
          onClick={handleSave}
          disabled={!settings.ddosPps || !settings.portScanPorts || !settings.bruteForceAttempts}
          className="flex items-center gap-2 bg-primary-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-primary-blue/20"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Configuration Saved!' : 'Save Configuration'}
        </button>
        
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 bg-dark-base hover:bg-dark-border text-gray-300 border border-dark-border px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Defaults
        </button>
      </div>
    </div>
  );
}
