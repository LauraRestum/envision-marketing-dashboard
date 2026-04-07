// /api/tiktok.js — Vercel API Route
// Proxies TikTok Business API calls for analytics.
// Caches responses in Firestore to handle API outages gracefully.

import getAdminDb from './_db.js';

const TIKTOK_BASE = 'https://open.tiktokapis.com/v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.TIKTOK_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'TikTok access token not configured.' });
  }

  const db = getAdminDb();
  const cacheKey = 'tiktok_profile';

  try {
    // Fetch user info
    const userRes = await fetch(`${TIKTOK_BASE}/user/info/?fields=display_name,follower_count,following_count,likes_count,video_count,avatar_url`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!userRes.ok) {
      const errBody = await userRes.json().catch(() => ({}));
      throw new Error(`TikTok API returned ${userRes.status}: ${errBody.error?.message || 'Unknown error'}`);
    }

    const userData = await userRes.json();
    const user = userData.data?.user || {};

    // Fetch recent videos
    const videosRes = await fetch(`${TIKTOK_BASE}/video/list/?fields=title,create_time,like_count,comment_count,share_count,view_count`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ max_count: 20 }),
    });

    let recentVideos = [];
    if (videosRes.ok) {
      const videosData = await videosRes.json();
      recentVideos = (videosData.data?.videos || []).slice(0, 10).map((v) => ({
        title: (v.title || '').slice(0, 120),
        created: v.create_time,
        likes: v.like_count || 0,
        comments: v.comment_count || 0,
        shares: v.share_count || 0,
        views: v.view_count || 0,
      }));
    }

    const summary = {
      followers: user.follower_count || 0,
      name: user.display_name || 'TikTok',
      following: user.following_count || 0,
      totalLikes: user.likes_count || 0,
      videoCount: user.video_count || 0,
      recentVideos,
    };

    await db.collection('analytics_cache').doc(cacheKey).set({
      data: summary,
      lastSynced: new Date().toISOString(),
    });

    return res.status(200).json({
      ...summary,
      _cached: false,
      _lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    console.error('TikTok API error:', err.message);

    try {
      const cached = await db.collection('analytics_cache').doc(cacheKey).get();
      if (cached.exists) {
        const cachedData = cached.data();
        return res.status(200).json({
          ...cachedData.data,
          _cached: true,
          _lastSynced: cachedData.lastSynced,
          _error: 'TikTok API unavailable. Showing cached data.',
        });
      }
    } catch (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

    return res.status(502).json({
      error: `TikTok API unavailable and no cached data found. ${err.message}`,
    });
  }
}
