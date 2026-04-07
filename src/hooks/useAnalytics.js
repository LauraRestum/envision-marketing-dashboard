import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';

// Mock data used when no live API data is cached yet
const MOCK_PLATFORM_DATA = {
  facebook: {
    platform: 'facebook',
    followers: 4820,
    followersChange: 63,
    reachThisMonth: 28400,
    impressionsThisMonth: 41200,
    engagementRate: 4.2,
    lastSynced: null,
    live: false,
  },
  instagram: {
    platform: 'instagram',
    followers: 3150,
    followersChange: 87,
    reachThisMonth: 19600,
    impressionsThisMonth: 32100,
    engagementRate: 5.8,
    lastSynced: null,
    live: false,
  },
  tiktok: {
    platform: 'tiktok',
    followers: 1240,
    followersChange: 142,
    reachThisMonth: 56300,
    impressionsThisMonth: 78400,
    engagementRate: 8.1,
    lastSynced: null,
    live: false,
  },
  linkedin: {
    platform: 'linkedin',
    followers: 6930,
    followersChange: 41,
    reachThisMonth: 12800,
    impressionsThisMonth: 18900,
    engagementRate: 3.4,
    lastSynced: null,
    live: false,
  },
};

function generateMockTrend(days, base, variance) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().split('T')[0],
      value: Math.round(base + (Math.random() - 0.4) * variance),
    });
  }
  return data;
}

const MOCK_TRENDS = {
  facebook: { reach: generateMockTrend(30, 950, 400), impressions: generateMockTrend(30, 1400, 500), engagement: generateMockTrend(30, 4.2, 2) },
  instagram: { reach: generateMockTrend(30, 650, 300), impressions: generateMockTrend(30, 1100, 400), engagement: generateMockTrend(30, 5.8, 3) },
  tiktok: { reach: generateMockTrend(30, 1880, 800), impressions: generateMockTrend(30, 2600, 900), engagement: generateMockTrend(30, 8.1, 4) },
  linkedin: { reach: generateMockTrend(30, 430, 200), impressions: generateMockTrend(30, 630, 250), engagement: generateMockTrend(30, 3.4, 1.5) },
};

const MOCK_TOP_POSTS = [
  { platform: 'tiktok', copy: 'Behind the scenes at the Envision research lab, where our team is developing next-gen assistive tech', engagement: 12.4, date: '2026-03-28' },
  { platform: 'instagram', copy: 'Meet James, who went from our employment program to leading a team of 12. His story is just getting started.', engagement: 9.2, date: '2026-03-25' },
  { platform: 'facebook', copy: 'This month our Vision Rehab team served 340 individuals across Kansas and Texas. Every number is a person.', engagement: 7.8, date: '2026-03-22' },
  { platform: 'linkedin', copy: 'Envision was recognized by the National Industries for the Blind for outstanding employment outcomes in 2025.', engagement: 6.1, date: '2026-04-01' },
  { platform: 'instagram', copy: 'Art without limits. Our Arts & Culture program showcased 22 artists at the spring exhibition last weekend.', engagement: 5.9, date: '2026-03-30' },
];

export default function useAnalytics() {
  const [platformData, setPlatformData] = useState(MOCK_PLATFORM_DATA);
  const [trends, setTrends] = useState(MOCK_TRENDS);
  const [topPosts, setTopPosts] = useState(MOCK_TOP_POSTS);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Try to load cached data from Firestore
    const platforms = ['facebook', 'instagram', 'tiktok', 'linkedin'];
    const unsubs = platforms.map((p) =>
      onSnapshot(doc(db, 'analytics_cache', p), (snap) => {
        if (snap.exists()) {
          const cached = snap.data();
          if (cached.summary) {
            setPlatformData((prev) => ({ ...prev, [p]: { ...cached.summary, live: true, lastSynced: cached.lastSynced } }));
          }
          if (cached.trends) {
            setTrends((prev) => ({ ...prev, [p]: cached.trends }));
          }
          if (cached.topPosts) {
            setTopPosts((prev) => {
              const others = prev.filter((tp) => tp.platform !== p);
              return [...others, ...cached.topPosts].sort((a, b) => b.engagement - a.engagement).slice(0, 5);
            });
          }
        }
      }, () => {})
    );

    setLoading(false);
    return () => unsubs.forEach((u) => u());
  }, []);

  const refreshPlatform = useCallback(async (platform) => {
    const endpoint = platform === 'facebook' || platform === 'instagram'
      ? `/api/analytics/meta?platform=${platform}`
      : `/api/analytics/${platform}`;

    try {
      const res = await fetch(endpoint);
      const data = await res.json();

      if (data._cached) {
        setErrors((prev) => ({ ...prev, [platform]: `Last synced ${data._lastSynced || 'unknown'}. Live data unavailable.` }));
      } else if (data.error) {
        setErrors((prev) => ({ ...prev, [platform]: data.error }));
      } else {
        setErrors((prev) => { const n = { ...prev }; delete n[platform]; return n; });
      }

      if (data.summary) {
        setPlatformData((prev) => ({ ...prev, [platform]: { ...data.summary, live: true, lastSynced: data._lastSynced } }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, [platform]: 'Network error. Showing cached data.' }));
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([
      refreshPlatform('facebook'),
      refreshPlatform('instagram'),
      refreshPlatform('tiktok'),
      refreshPlatform('linkedin'),
    ]);
  }, [refreshPlatform]);

  return { platformData, trends, topPosts, loading, errors, refreshPlatform, refreshAll };
}
