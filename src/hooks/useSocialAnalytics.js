import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'linkedin'];

export default function useSocialAnalytics() {
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const results = {};

    // Load all platform data from Firestore
    const configDoc = await getDoc(doc(db, 'config', 'social_handles')).catch(() => null);
    const handles = configDoc?.exists() ? configDoc.data() : {};

    for (const platform of PLATFORMS) {
      try {
        if (platform === 'linkedin' && handles.linkedin) {
          // LinkedIn: try live scrape via API route
          const res = await fetch(`/api/social?handle=${encodeURIComponent(handles.linkedin)}`);
          if (res.ok) {
            const data = await res.json();
            results.linkedin = { connected: true, ...data };
            continue;
          }
        }

        // All platforms: read manual/cached data from Firestore
        const cacheDoc = await getDoc(doc(db, 'analytics_cache', platform));
        if (cacheDoc.exists()) {
          const cached = cacheDoc.data();
          results[platform] = {
            connected: true,
            followers: cached.followers,
            name: cached.name || platform,
            handle: cached.handle || handles[platform] || '',
            _lastSynced: cached.lastUpdated || cached.lastSynced,
            _manual: platform !== 'linkedin',
          };
        } else {
          results[platform] = { connected: false };
        }
      } catch {
        results[platform] = { connected: false };
      }
    }

    setAnalytics(results);
    setLoading(false);
  }, []);

  // Save a manual follower count update
  const updateFollowers = useCallback(async (platform, followers) => {
    const parsed = parseInt(String(followers).replace(/[\s,]/g, ''));
    if (isNaN(parsed)) return;

    await setDoc(doc(db, 'analytics_cache', platform), {
      followers: parsed,
      name: platform,
      lastUpdated: new Date().toISOString(),
    }, { merge: true });

    setAnalytics((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        connected: true,
        followers: parsed,
        _lastSynced: new Date().toISOString(),
        _manual: true,
      },
    }));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { analytics, loading, refresh, updateFollowers };
}
