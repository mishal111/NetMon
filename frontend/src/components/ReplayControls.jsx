import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Activity } from 'lucide-react';
import useStore from '../store/useStore';

export default function ReplayControls() {
  const { replayStatus, replayProgress } = useStore();
  
  if (!replayStatus.active) return null;

  const handlePause = async () => {
    try {
      await fetch('http://localhost:8001/api/forensics/replay/pause', { method: 'POST' });
    } catch (e) {
      console.error("Failed to pause", e);
    }
  };

  const handlePlay = async () => {
    try {
      await fetch('http://localhost:8001/api/forensics/replay/play', { method: 'POST' });
    } catch (e) {
      console.error("Failed to play", e);
    }
  };

  const handleStop = async () => {
    try {
      await fetch('http://localhost:8001/api/forensics/replay/stop', { method: 'POST' });
    } catch (e) {
      console.error("Failed to stop", e);
    }
  };

  const isPaused = replayProgress.status === 'paused';
  const progressPercent = replayProgress.total > 0 
    ? (replayProgress.current / replayProgress.total) * 100 
    : 0;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 bg-dark-card border border-dark-border px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-md w-full max-w-lg"
      >
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isPaused ? 'text-gray-500' : 'text-severity-success animate-pulse'}`} />
            <span className="text-sm font-semibold text-gray-200">{replayStatus.filename}</span>
          </div>
          <span className="text-xs font-mono text-gray-400">
            {replayProgress.current} / {replayProgress.total} Packets
          </span>
        </div>
        
        {/* Progress Bar Track */}
        <div className="h-2 w-full bg-dark-base rounded-full overflow-hidden border border-dark-border/50">
          <motion.div 
            className="h-full bg-primary-blue"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ ease: "linear", duration: 0.2 }}
          />
        </div>

        <div className="flex justify-center items-center gap-4 mt-2">
          {isPaused ? (
            <button 
              onClick={handlePlay}
              className="p-3 rounded-full bg-primary-blue text-white hover:bg-blue-600 transition-colors shadow-lg"
              title="Resume Playback"
            >
              <Play className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button 
              onClick={handlePause}
              className="p-3 rounded-full bg-dark-base border border-dark-border text-white hover:bg-gray-800 transition-colors shadow-lg"
              title="Pause Playback"
            >
              <Pause className="w-5 h-5 fill-current" />
            </button>
          )}

          <button 
            onClick={handleStop}
            className="p-3 rounded-full bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors shadow-lg"
            title="Stop Playback"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
