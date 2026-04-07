import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'linkedin'];
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function useSocialAnalytics() {
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchPlatform = useCallback(async (platform) => {
    // Try the live API route first
    try {
      let url;
      if (platform === 'facebook' || platform === 'instagram') {
        // page_id must be configured per-deployment; read from Firestore config
        const configDoc = await getDoc(doc(db, 'config', 'social_ids'));
        const ids = configDoc.exists() ? configDoc.data() : {};
        const pageId = platform === 'facebook' ? ids.facebook_page_id : ids.instagram_page_id;
        if (!pageId) return { connected: false, error: 'Page ID not configured' };
        url = `/api/meta?action=${platform}&page_id=${pageId}`;
      } else if (platform === 'tiktok') {
        url = '/api/tiktok';
      } else if (platform === 'linkedin') {
        const configDoc = await getDoc(doc(db, 'config', 'social_ids'));
        const ids = configDoc.exists() ? configDoc.data() : {};
        if (!ids.linkedin_org_id) return { connected: false, error: 'Org ID not configured' };
        url = `/api/linkedin?org_id=${ids.linkedin_org_id}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        return { connected: true, ...data };
      }
      return { connected: false, error: data.error };
    } catch (err) {
      // Fall back to Firestore cache
      try {
        const cacheKey = platform === 'facebook' ? 'facebook' : platform;
        const cached = await getDoc(doc(db, 'analytics_cache', cacheKey));
        if (cached.exists()) {
          const cachedData = cached.data();
          return {
            connected: true,
            ...cachedData.data,
            _cached: true,
            _lastSynced: cachedData.lastSynced,
          };
        }
      } catch { /* ignore */ }
      return { connected: false, error: err.message };
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = {};
    await Promise.allSettled(
      PLATFORMS.map(async (p) => {
        results[p] = await fetchPlatform(p);
      })
    );
    setAnalytics(results);
    setLoading(false);
  }, [fetchPlatform]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return { analytics, loading, refresh };
}
