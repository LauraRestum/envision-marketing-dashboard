// /api/social.js — Vercel API Route
// Scrapes LinkedIn company pages for live follower counts.
// Facebook, Instagram, and TikTok block server-side scraping, so those
// platforms use manual entry saved directly in Firestore from the frontend.

import getAdminDb from './_db.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ─── LinkedIn Scraper (the only platform that works server-side) ────

async function scrapeLinkedIn(handle) {
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

function extractHandle(input) {
  let cleaned = input.trim().split('?')[0].split('#')[0].replace(/\/+$/, '');
  const liMatch = cleaned.match(/linkedin\.com\/company\/([A-Za-z0-9_-]+)/i);
  if (liMatch) return liMatch[1];
  return cleaned.replace(/^company\//, '');
}

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

// ─── Route Handler ───────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { handle } = req.query;
  if (!handle) {
    return res.status(400).json({ error: 'handle is required. Example: /api/social?handle=envision-inc' });
  }

  const cleanHandle = extractHandle(handle);
  const db = getAdminDb();
  const cacheKey = `linkedin_${cleanHandle.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

  try {
    const data = await scrapeLinkedIn(cleanHandle);

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
    console.error(`LinkedIn scrape error (${cleanHandle}):`, err.message);

    try {
      const cached = await db.collection('analytics_cache').doc(cacheKey).get();
      if (cached.exists) {
        const cachedData = cached.data();
        return res.status(200).json({
          ...cachedData.data,
          _cached: true,
          _lastSynced: cachedData.lastSynced,
          _error: 'Could not reach LinkedIn. Showing cached data.',
        });
      }
    } catch (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

    return res.status(502).json({
      error: `Could not scrape LinkedIn profile "${cleanHandle}". ${err.message}`,
    });
  }
}
