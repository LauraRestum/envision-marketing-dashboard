// /api/analytics/meta.js — Vercel API Route
// Fetches analytics from Meta Graph API for Facebook and Instagram.
// Caches responses in Firestore. Falls back to cache on API failure.
//
// Requires META_ACCESS_TOKEN in Vercel env variables.
// Meta developer app approval required before this returns live data.

import getAdminDb from '../_db.js';
import { normalizePlatformData } from './_normalizer.js';

const META_BASE = 'https://graph.facebook.com/v18.0';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const platform = req.query.platform || 'facebook';
  if (platform !== 'facebook' && platform !== 'instagram') {
    return res.status(400).json({ error: 'Platform must be facebook or instagram' });
  }

  const token = process.env.META_ACCESS_TOKEN;
  const db = getAdminDb();
  const cacheRef = db.collection('analytics_cache').doc(platform);

  if (!token) {
    // No token configured, return cached data or empty
    return returnCachedOrEmpty(cacheRef, res, platform, 'Meta API token not configured. Add META_ACCESS_TOKEN to Vercel environment variables.');
  }

  try {
    // Fetch page/account data
    const pageId = platform === 'facebook'
      ? process.env.META_FB_PAGE_ID
      : process.env.META_IG_ACCOUNT_ID;

    if (!pageId) {
      return returnCachedOrEmpty(cacheRef, res, platform, `${platform} page/account ID not configured.`);
    }

    const fields = platform === 'facebook'
      ? 'fan_count,followers_count'
      : 'followers_count,media_count';

    const profileRes = await fetch(`${META_BASE}/${pageId}?fields=${fields}&access_token=${token}`);
    if (!profileRes.ok) throw new Error(`Meta API returned ${profileRes.status}`);
    const profileData = await profileRes.json();

    // Fetch insights (reach, impressions, engagement)
    const insightsMetrics = platform === 'facebook'
      ? 'page_impressions,page_engaged_users,page_fan_adds'
      : 'impressions,reach,accounts_engaged';

    const insightsRes = await fetch(
      `${META_BASE}/${pageId}/insights?metric=${insightsMetrics}&period=day&since=${thirtyDaysAgo()}&until=${today()}&access_token=${token}`
    );

    let insightsData = {};
    if (insightsRes.ok) {
      insightsData = await insightsRes.json();
    }

    // Build raw data object for normalizer
    const rawData = {
      followers_count: profileData.followers_count || profileData.fan_count || 0,
      fan_count: profileData.fan_count || 0,
      followers_change: 0,
      reach: sumInsightMetric(insightsData, 'reach') || sumInsightMetric(insightsData, 'page_impressions'),
      impressions: sumInsightMetric(insightsData, 'impressions') || sumInsightMetric(insightsData, 'page_impressions'),
      engagement_rate: 0,
      reach_trend: extractTrend(insightsData, 'reach') || extractTrend(insightsData, 'page_impressions'),
      impressions_trend: extractTrend(insightsData, 'impressions') || extractTrend(insightsData, 'page_impressions'),
      engagement_trend: extractTrend(insightsData, 'accounts_engaged') || extractTrend(insightsData, 'page_engaged_users'),
      top_posts: [],
    };

    const normalized = normalizePlatformData(platform, rawData);

    // Cache the result
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
    console.error(`Meta API error (${platform}):`, err.message);
    return returnCachedOrEmpty(cacheRef, res, platform, `Meta API unavailable: ${err.message}`);
  }
}

async function returnCachedOrEmpty(cacheRef, res, platform, errorMsg) {
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

function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function sumInsightMetric(data, metricName) {
  const metric = (data.data || []).find((m) => m.name === metricName);
  if (!metric) return 0;
  return (metric.values || []).reduce((sum, v) => sum + (v.value || 0), 0);
}

function extractTrend(data, metricName) {
  const metric = (data.data || []).find((m) => m.name === metricName);
  if (!metric) return [];
  return (metric.values || []).map((v) => ({
    end_time: v.end_time,
    value: v.value || 0,
  }));
}
