// /api/meta.js — Vercel API Route
// Proxies Meta Graph API calls for Facebook and Instagram analytics.
// Caches responses in Firestore to handle API outages gracefully.

import getAdminDb from './_db.js';

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Meta access token not configured.' });
  }

  const { action, page_id } = req.query;

  if (!page_id) {
    return res.status(400).json({ error: 'page_id is required.' });
  }

  let endpoints = {};

  if (action === 'facebook') {
    endpoints = {
      page: `${GRAPH_BASE}/${page_id}?fields=name,followers_count,fan_count,engagement&access_token=${token}`,
      posts: `${GRAPH_BASE}/${page_id}/posts?fields=message,created_time,shares,likes.summary(true),comments.summary(true)&limit=25&access_token=${token}`,
    };
  } else if (action === 'instagram') {
    endpoints = {
      profile: `${GRAPH_BASE}/${page_id}?fields=name,username,followers_count,media_count,profile_picture_url&access_token=${token}`,
      media: `${GRAPH_BASE}/${page_id}/media?fields=caption,timestamp,like_count,comments_count,media_type,permalink&limit=25&access_token=${token}`,
    };
  } else {
    return res.status(400).json({ error: 'Invalid action. Use: facebook or instagram' });
  }

  const db = getAdminDb();
  const cacheKey = `${action}_${page_id}`;

  try {
    const results = {};
    for (const [key, url] of Object.entries(endpoints)) {
      const response = await fetch(url);
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(`Meta API returned ${response.status}: ${errBody.error?.message || 'Unknown error'}`);
      }
      results[key] = await response.json();
    }

    // Derive summary metrics
    const summary = action === 'facebook'
      ? {
          followers: results.page.followers_count || results.page.fan_count || 0,
          name: results.page.name,
          recentPosts: (results.posts.data || []).slice(0, 10).map((p) => ({
            message: (p.message || '').slice(0, 120),
            created: p.created_time,
            likes: p.likes?.summary?.total_count || 0,
            comments: p.comments?.summary?.total_count || 0,
            shares: p.shares?.count || 0,
          })),
        }
      : {
          followers: results.profile.followers_count || 0,
          name: results.profile.name || results.profile.username,
          username: results.profile.username,
          mediaCount: results.profile.media_count || 0,
          recentMedia: (results.media.data || []).slice(0, 10).map((m) => ({
            caption: (m.caption || '').slice(0, 120),
            timestamp: m.timestamp,
            likes: m.like_count || 0,
            comments: m.comments_count || 0,
            type: m.media_type,
            permalink: m.permalink,
          })),
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
    console.error('Meta API error:', err.message);

    try {
      const cached = await db.collection('analytics_cache').doc(cacheKey).get();
      if (cached.exists) {
        const cachedData = cached.data();
        return res.status(200).json({
          ...cachedData.data,
          _cached: true,
          _lastSynced: cachedData.lastSynced,
          _error: `Meta API unavailable. Showing cached data.`,
        });
      }
    } catch (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

    return res.status(502).json({
      error: `Meta API unavailable and no cached data found. ${err.message}`,
    });
  }
}
