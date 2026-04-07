import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'linkedin'];
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function useSocialAnalytics() {
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [handles, setHandles] = useState({});

  // Load configured social handles from Firestore
  const loadHandles = useCallback(async () => {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'social_handles'));
      if (configDoc.exists()) return configDoc.data();
    } catch { /* ignore */ }
    return {};
  }, []);

  const fetchPlatform = useCallback(async (platform, handle) => {
    if (!handle) return { connected: false, error: 'Handle not configured' };

    try {
      const res = await fetch(`/api/social?platform=${platform}&handle=${encodeURIComponent(handle)}`);
      const data = await res.json();
      if (res.ok) return { connected: true, ...data };
      return { connected: false, error: data.error };
    } catch (err) {
      return { connected: false, error: err.message };
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const h = await loadHandles();
    setHandles(h);

    const results = {};
    await Promise.allSettled(
      PLATFORMS.map(async (p) => {
        results[p] = await fetchPlatform(p, h[p]);
      })
    );
    setAnalytics(results);
    setLoading(false);
  }, [fetchPlatform, loadHandles]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return { analytics, loading, refresh, handles };
}
