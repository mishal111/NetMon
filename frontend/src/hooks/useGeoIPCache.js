import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchGeoIPBatch, getCountryFlag } from '../utils/geoIP';

const CACHE_KEY = 'netmon_geoip_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default function useGeoIPCache(enabled) {
  const [geoData, setGeoData] = useState({});
  const pendingIps = useRef(new Set());
  const timeoutRef = useRef(null);

  // Load cache on mount
  useEffect(() => {
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cache = JSON.parse(cachedStr);
        const now = Date.now();
        const validCache = {};
        
        let hasExpired = false;
        Object.entries(cache).forEach(([ip, entry]) => {
          if (now - entry.timestamp < CACHE_TTL) {
            validCache[ip] = entry;
          } else {
            hasExpired = true;
          }
        });

        setGeoData(validCache);
        if (hasExpired) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(validCache));
        }
      }
    } catch (e) {
      console.error("Failed to parse geoip cache");
    }
  }, []);

  const dispatchBatchFetch = useCallback(async () => {
    if (pendingIps.current.size === 0) return;

    const ipsToFetch = Array.from(pendingIps.current);
    pendingIps.current.clear(); // Reset for next batch

    const results = await fetchGeoIPBatch(ipsToFetch);
    
    if (results.length > 0) {
      setGeoData(prev => {
        const next = { ...prev };
        const now = Date.now();
        
        results.forEach(res => {
          if (res.status === 'success') {
            next[res.query] = {
              country: res.country,
              countryCode: res.countryCode,
              city: res.city,
              flag: getCountryFlag(res.countryCode),
              timestamp: now
            };
          } else {
            // Cache failed lookups so we don't spam
            next[res.query] = {
              country: 'Unknown',
              countryCode: 'XX',
              city: 'Unknown',
              flag: '🏳️',
              timestamp: now
            };
          }
        });
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const resolveIPs = useCallback((ips) => {
    if (!enabled) return;

    let needsFetch = false;
    ips.forEach(ip => {
      // Is external?
      if (!ip.startsWith('127.') && !ip.startsWith('10.') && !ip.startsWith('192.168.') && !ip.startsWith('172.')) {
        if (!geoData[ip] && !pendingIps.current.has(ip)) {
          pendingIps.current.add(ip);
          needsFetch = true;
        }
      }
    });

    if (needsFetch) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(dispatchBatchFetch, 500); // Debounce 500ms
    }
  }, [enabled, geoData, dispatchBatchFetch]);

  return { geoData, resolveIPs };
}
