// /api/linkedin.js — Vercel API Route
// Proxies LinkedIn API calls for organization page analytics.
// Caches responses in Firestore to handle API outages gracefully.

import getAdminDb from './_db.js';

const LINKEDIN_BASE = 'https://api.linkedin.com/v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'LinkedIn access token not configured.' });
  }

  const { org_id } = req.query;
  if (!org_id) {
    return res.status(400).json({ error: 'org_id is required.' });
  }

  const db = getAdminDb();
  const cacheKey = `linkedin_${org_id}`;

  try {
    // Fetch organization info
    const orgRes = await fetch(`${LINKEDIN_BASE}/organizations/${org_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!orgRes.ok) {
      throw new Error(`LinkedIn API returned ${orgRes.status}`);
    }

    const orgData = await orgRes.json();

    // Fetch follower count
    const followersRes = await fetch(
      `${LINKEDIN_BASE}/organizationalEntityFollowerStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:${org_id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    let followerCount = 0;
    if (followersRes.ok) {
      const followersData = await followersRes.json();
      const stats = followersData.elements?.[0];
      followerCount = (stats?.followerCounts?.organicFollowerCount || 0)
        + (stats?.followerCounts?.paidFollowerCount || 0);
    }

    // Fetch recent posts (shares)
    const postsRes = await fetch(
      `${LINKEDIN_BASE}/ugcPosts?q=authors&authors=List(urn:li:organization:${org_id})&sortBy=LAST_MODIFIED&count=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    let recentPosts = [];
    if (postsRes.ok) {
      const postsData = await postsRes.json();
      recentPosts = (postsData.elements || []).slice(0, 10).map((p) => ({
        text: (p.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text || '').slice(0, 120),
        created: p.created?.time,
      }));
    }

    const summary = {
      followers: followerCount,
      name: orgData.localizedName || 'LinkedIn',
      recentPosts,
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
    console.error('LinkedIn API error:', err.message);

    try {
      const cached = await db.collection('analytics_cache').doc(cacheKey).get();
      if (cached.exists) {
        const cachedData = cached.data();
        return res.status(200).json({
          ...cachedData.data,
          _cached: true,
          _lastSynced: cachedData.lastSynced,
          _error: 'LinkedIn API unavailable. Showing cached data.',
        });
      }
    } catch (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

    return res.status(502).json({
      error: `LinkedIn API unavailable and no cached data found. ${err.message}`,
    });
  }
}
