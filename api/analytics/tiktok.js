// /api/analytics/tiktok.js — Vercel API Route
// Fetches analytics from TikTok Display API.
// Caches responses in Firestore. Falls back to cache on API failure.
//
// Requires TIKTOK_ACCESS_TOKEN in Vercel env variables.
// TikTok developer app approval required before this returns live data.

import getAdminDb from '../_db.js';
import { normalizePlatformData } from './_normalizer.js';

const TIKTOK_BASE = 'https://open.tiktokapis.com/v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TIKTOK_ACCESS_TOKEN;
  const db = getAdminDb();
  const cacheRef = db.collection('analytics_cache').doc('tiktok');

  if (!token) {
    return returnCachedOrEmpty(cacheRef, res, 'TikTok API token not configured. Add TIKTOK_ACCESS_TOKEN to Vercel environment variables.');
  }

  try {
    // Fetch user info (followers, etc.)
    const userRes = await fetch(`${TIKTOK_BASE}/user/info/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: ['follower_count', 'following_count', 'likes_count', 'video_count'],
      }),
    });

    if (!userRes.ok) throw new Error(`TikTok API returned ${userRes.status}`);
    const userData = await userRes.json();
    const user = userData.data?.user || {};

    const rawData = {
      follower_count: user.follower_count || 0,
      followers_change: 0,
      video_views: 0,
      engagement_rate: 0,
      views_trend: [],
      engagement_trend: [],
      top_videos: [],
    };

    const normalized = normalizePlatformData('tiktok', rawData);

    await cacheRef.set({
      summary: normalized.summary,
      trends: normalized.trends,
      topPosts: normalized.topPosts,
      lastSynced: new Date().toISOString(),
    });

    return res.status(200).json({
      ...normalized,
      _cached: false,
      _lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    console.error('TikTok API error:', err.message);
    return returnCachedOrEmpty(cacheRef, res, `TikTok API unavailable: ${err.message}`);
  }
}

async function returnCachedOrEmpty(cacheRef, res, errorMsg) {
  try {
    const cached = await cacheRef.get();
    if (cached.exists) {
      const data = cached.data();
      return res.status(200).json({
        summary: data.summary,
        trends: data.trends,
        topPosts: data.topPosts,
        _cached: true,
        _lastSynced: data.lastSynced,
        _error: errorMsg,
      });
    }
  } catch {}

  return res.status(200).json({
    summary: null,
    _cached: false,
    _lastSynced: null,
    _error: errorMsg,
  });
}
