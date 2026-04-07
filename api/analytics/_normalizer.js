// Unified data normalizer for social platform analytics.
// Maps each platform's different response structure to one common schema.
// This prevents the UI from breaking if one API changes its response format.

export function normalizePlatformData(platform, rawData) {
  const normalizers = {
    facebook: normalizeMeta,
    instagram: normalizeMeta,
    tiktok: normalizeTikTok,
    linkedin: normalizeLinkedIn,
  };

  const fn = normalizers[platform];
  if (!fn) throw new Error(`No normalizer for platform: ${platform}`);
  return fn(platform, rawData);
}

function normalizeMeta(platform, data) {
  // Meta Graph API returns separate endpoints for different metrics
  // This normalizes them into our common schema
  return {
    summary: {
      platform,
      followers: data.followers_count || data.fan_count || 0,
      followersChange: data.followers_change || 0,
      reachThisMonth: data.reach || 0,
      impressionsThisMonth: data.impressions || 0,
      engagementRate: data.engagement_rate || 0,
    },
    trends: {
      reach: (data.reach_trend || []).map((d) => ({ date: d.end_time?.split('T')[0] || d.date, value: d.value || 0 })),
      impressions: (data.impressions_trend || []).map((d) => ({ date: d.end_time?.split('T')[0] || d.date, value: d.value || 0 })),
      engagement: (data.engagement_trend || []).map((d) => ({ date: d.end_time?.split('T')[0] || d.date, value: d.value || 0 })),
    },
    topPosts: (data.top_posts || []).map((p) => ({
      platform,
      copy: p.message || p.caption || '',
      engagement: p.engagement_rate || 0,
      date: p.created_time?.split('T')[0] || p.timestamp?.split('T')[0] || '',
    })),
  };
}

function normalizeTikTok(platform, data) {
  return {
    summary: {
      platform: 'tiktok',
      followers: data.follower_count || 0,
      followersChange: data.followers_change || 0,
      reachThisMonth: data.video_views || 0,
      impressionsThisMonth: data.video_views || 0,
      engagementRate: data.engagement_rate || 0,
    },
    trends: {
      reach: (data.views_trend || []).map((d) => ({ date: d.date, value: d.value || 0 })),
      impressions: (data.views_trend || []).map((d) => ({ date: d.date, value: d.value || 0 })),
      engagement: (data.engagement_trend || []).map((d) => ({ date: d.date, value: d.value || 0 })),
    },
    topPosts: (data.top_videos || []).map((v) => ({
      platform: 'tiktok',
      copy: v.title || v.description || '',
      engagement: v.engagement_rate || 0,
      date: v.create_time ? new Date(v.create_time * 1000).toISOString().split('T')[0] : '',
    })),
  };
}

function normalizeLinkedIn(platform, data) {
  return {
    summary: {
      platform: 'linkedin',
      followers: data.follower_count || data.firstDegreeSize || 0,
      followersChange: data.followers_change || 0,
      reachThisMonth: data.impressions || 0,
      impressionsThisMonth: data.impressions || 0,
      engagementRate: data.engagement_rate || 0,
    },
    trends: {
      reach: (data.impressions_trend || []).map((d) => ({ date: d.date, value: d.value || 0 })),
      impressions: (data.impressions_trend || []).map((d) => ({ date: d.date, value: d.value || 0 })),
      engagement: (data.engagement_trend || []).map((d) => ({ date: d.date, value: d.value || 0 })),
    },
    topPosts: (data.top_posts || []).map((p) => ({
      platform: 'linkedin',
      copy: p.commentary || p.text || '',
      engagement: p.engagement_rate || 0,
      date: p.created?.time ? new Date(p.created.time).toISOString().split('T')[0] : '',
    })),
  };
}
