// /api/analytics/linkedin.js — Vercel API Route
// Fetches analytics from LinkedIn Marketing API.
// Caches responses in Firestore. Falls back to cache on API failure.
//
// Requires LINKEDIN_ACCESS_TOKEN in Vercel env variables.
// LinkedIn developer app approval required before this returns live data.

import getAdminDb from '../_db.js';
import { normalizePlatformData } from './_normalizer.js';

const LI_BASE = 'https://api.linkedin.com/v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  const db = getAdminDb();
  const cacheRef = db.collection('analytics_cache').doc('linkedin');

  if (!token) {
    return returnCachedOrEmpty(cacheRef, res, 'LinkedIn API token not configured. Add LINKEDIN_ACCESS_TOKEN to Vercel environment variables.');
  }

  try {
    const orgId = process.env.LINKEDIN_ORG_ID;
    if (!orgId) {
      return returnCachedOrEmpty(cacheRef, res, 'LinkedIn organization ID not configured. Add LINKEDIN_ORG_ID to Vercel environment variables.');
    }

    // Fetch follower count
    const followersRes = await fetch(
      `${LI_BASE}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${orgId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    let followerCount = 0;
    if (followersRes.ok) {
      const followersData = await followersRes.json();
      const stats = followersData.elements?.[0];
      followerCount = stats?.followerCounts?.organicFollowerCount || stats?.firstDegreeSize || 0;
    }

    // Fetch page statistics (impressions, engagement)
    const statsRes = await fetch(
      `${LI_BASE}/organizationPageStatistics?q=organization&organization=urn:li:organization:${orgId}&timeIntervals.timeGranularityType=DAY&timeIntervals.timeRange.start=${thirtyDaysAgoMs()}&timeIntervals.timeRange.end=${nowMs()}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    let impressions = 0;
    let impressionsTrend = [];
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      const elements = statsData.elements || [];
      elements.forEach((el) => {
        const views = el.totalPageStatistics?.views?.allPageViews?.pageViews || 0;
        impressions += views;
        if (el.timeRange?.start) {
          impressionsTrend.push({
            date: new Date(el.timeRange.start).toISOString().split('T')[0],
            value: views,
          });
        }
      });
    }

    const rawData = {
      follower_count: followerCount,
      followers_change: 0,
      impressions,
      engagement_rate: 0,
      impressions_trend: impressionsTrend,
      top_posts: [],
    };

    const normalized = normalizePlatformData('linkedin', rawData);

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
    console.error('LinkedIn API error:', err.message);
    return returnCachedOrEmpty(cacheRef, res, `LinkedIn API unavailable: ${err.message}`);
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

function thirtyDaysAgoMs() {
  return Date.now() - 30 * 24 * 60 * 60 * 1000;
}

function nowMs() {
  return Date.now();
}
