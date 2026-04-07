// /api/social.js — Vercel API Route
// Scrapes public social media profiles for follower counts and basic stats.
// No API tokens required — reads publicly available page data.
// Caches results in Firestore so the dashboard isn't hammering public pages.

import getAdminDb from './_db.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ─── Scrapers ────────────────────────────────────────────────

async function scrapeFacebook(handle) {
  const url = `https://www.facebook.com/${handle}`;
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`Facebook returned ${res.status}`);
  const html = await res.text();

  // Try og:description which often has "X likes · Y followers"
  const ogDesc = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i)?.[1] || '';
  const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1] || handle;

  let followers = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*followers/i);
  let likes = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*likes/i);

  // Fallback: search for follower counts in JSON-LD or embedded data
  if (!followers) {
    const jsonMatch = html.match(/"follower_count"\s*:\s*(\d+)/);
    if (jsonMatch) followers = parseInt(jsonMatch[1]);
  }

  return {
    platform: 'facebook',
    name: ogTitle,
    handle,
    followers: followers || null,
    likes: likes || null,
    profileUrl: url,
  };
}

async function scrapeInstagram(handle) {
  const url = `https://www.instagram.com/${handle}/`;
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`Instagram returned ${res.status}`);
  const html = await res.text();

  // og:description often has "X Followers, Y Following, Z Posts"
  const ogDesc = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i)?.[1] || '';
  const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1] || handle;

  let followers = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*Followers/i);
  let following = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*Following/i);
  let posts = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*Posts/i);

  // Fallback: embedded JSON
  if (!followers) {
    const jsonMatch = html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)/);
    if (jsonMatch) followers = parseInt(jsonMatch[1]);
  }
  if (!followers) {
    const metaMatch = html.match(/"follower_count"\s*:\s*(\d+)/);
    if (metaMatch) followers = parseInt(metaMatch[1]);
  }

  return {
    platform: 'instagram',
    name: ogTitle,
    handle,
    followers: followers || null,
    following: following || null,
    posts: posts || null,
    profileUrl: url,
  };
}

async function scrapeTikTok(handle) {
  // Remove leading @ if present
  const clean = handle.replace(/^@/, '');
  const url = `https://www.tiktok.com/@${clean}`;
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`TikTok returned ${res.status}`);
  const html = await res.text();

  const ogDesc = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i)?.[1] || '';
  const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1] || clean;

  let followers = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*Followers/i);
  let likes = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*Likes/i);

  // Fallback: TikTok embeds JSON state in a script tag
  if (!followers) {
    const jsonMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
    if (jsonMatch) followers = parseInt(jsonMatch[1]);
  }
  if (!likes) {
    const jsonMatch = html.match(/"heartCount"\s*:\s*(\d+)/);
    if (jsonMatch) likes = parseInt(jsonMatch[1]);
  }

  let videoCount = null;
  const vidMatch = html.match(/"videoCount"\s*:\s*(\d+)/);
  if (vidMatch) videoCount = parseInt(vidMatch[1]);

  return {
    platform: 'tiktok',
    name: ogTitle,
    handle: clean,
    followers: followers || null,
    likes: likes || null,
    videoCount,
    profileUrl: url,
  };
}

async function scrapeLinkedIn(handle) {
  // handle can be "company/envision-us" or just "envision-us"
  const slug = handle.replace(/^company\//, '');
  const url = `https://www.linkedin.com/company/${slug}`;
  const res = await fetch(url, { headers: HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`LinkedIn returned ${res.status}`);
  const html = await res.text();

  const ogTitle = html.match(/<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"/i)?.[1] || slug;
  const ogDesc = html.match(/<meta\s+(?:property|name)="og:description"\s+content="([^"]+)"/i)?.[1] || '';

  let followers = parseStatFromText(ogDesc, /(\d[\d,.\s]*[KkMm]?)\s*followers/i);

  if (!followers) {
    const jsonMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
    if (jsonMatch) followers = parseInt(jsonMatch[1]);
  }

  return {
    platform: 'linkedin',
    name: ogTitle,
    handle: slug,
    followers: followers || null,
    profileUrl: url,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function parseStatFromText(text, regex) {
  const match = text.match(regex);
  if (!match) return null;
  return parseHumanNumber(match[1]);
}

function parseHumanNumber(str) {
  if (!str) return null;
  let cleaned = str.replace(/[\s,]/g, '');
  const multiplier = cleaned.match(/[KkMm]$/);
  if (multiplier) {
    cleaned = cleaned.slice(0, -1);
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    if (multiplier[0].toLowerCase() === 'k') return Math.round(num * 1_000);
    if (multiplier[0].toLowerCase() === 'm') return Math.round(num * 1_000_000);
  }
  const num = parseInt(cleaned);
  return isNaN(num) ? null : num;
}

const SCRAPERS = {
  facebook: scrapeFacebook,
  instagram: scrapeInstagram,
  tiktok: scrapeTikTok,
  linkedin: scrapeLinkedIn,
};

// ─── Route Handler ───────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, handle } = req.query;

  if (!platform || !handle) {
    return res.status(400).json({ error: 'Both platform and handle are required. Example: /api/social?platform=instagram&handle=envisionus' });
  }

  const scraper = SCRAPERS[platform.toLowerCase()];
  if (!scraper) {
    return res.status(400).json({ error: `Unknown platform: ${platform}. Use: facebook, instagram, tiktok, linkedin` });
  }

  const db = getAdminDb();
  const cacheKey = `${platform.toLowerCase()}_${handle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  try {
    const data = await scraper(handle);

    // Cache the successful scrape
    await db.collection('analytics_cache').doc(cacheKey).set({
      data,
      lastSynced: new Date().toISOString(),
    });

    return res.status(200).json({
      ...data,
      _cached: false,
      _lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`Social scrape error (${platform}/${handle}):`, err.message);

    // Fall back to cached data
    try {
      const cached = await db.collection('analytics_cache').doc(cacheKey).get();
      if (cached.exists) {
        const cachedData = cached.data();
        return res.status(200).json({
          ...cachedData.data,
          _cached: true,
          _lastSynced: cachedData.lastSynced,
          _error: `Could not reach ${platform}. Showing cached data.`,
        });
      }
    } catch (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

    return res.status(502).json({
      error: `Could not scrape ${platform} profile "${handle}". ${err.message}`,
    });
  }
}
