import { useState, useEffect, useRef } from 'react';

export default function usePerformanceMonitor() {
  const [fps, setFps] = useState(60);
  const frames = useRef(0);
  const prevTime = useRef(performance.now());
  const requestRef = useRef();

  useEffect(() => {
    const update = (time) => {
      frames.current += 1;
      
      // Update FPS every second
      if (time > prevTime.current + 1000) {
        setFps(Math.round((frames.current * 1000) / (time - prevTime.current)));
        prevTime.current = time;
        frames.current = 0;
      }
      
      requestRef.current = requestAnimationFrame(update);
    };

    requestRef.current = requestAnimationFrame(update);
    
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return fps;
}
