// /api/clickup.js — Vercel API Route
// Proxies ClickUp API calls so the API token stays server-side.
// Caches responses in Firestore to handle API outages gracefully.

import getAdminDb from './_db.js';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';

async function clickupFetch(endpoint, token) {
  // Try raw token first (personal API tokens), then Bearer format (OAuth tokens)
  let response = await fetch(endpoint, {
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
  });

  if (response.status === 401) {
    response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  }

  return response;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.CLICKUP_API_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'ClickUp API token not configured. Add CLICKUP_API_TOKEN in Vercel environment variables.' });
  }

  // Query params: action, team_id, list_id
  const { action, team_id, list_id } = req.query;

  let endpoint;
  if (action === 'tasks' && team_id) {
    endpoint = `${CLICKUP_BASE}/team/${team_id}/task?include_closed=true&subtasks=true&page=0`;
  } else if (action === 'list_tasks' && list_id) {
    endpoint = `${CLICKUP_BASE}/list/${list_id}/task?include_closed=true&subtasks=true`;
  } else if (action === 'teams') {
    endpoint = `${CLICKUP_BASE}/team`;
  } else {
    return res.status(400).json({ error: 'Invalid action. Use: teams, tasks (with team_id), or list_tasks (with list_id)' });
  }

  const db = getAdminDb();
  const cacheKey = action === 'tasks' ? `tasks_${team_id}` : action === 'list_tasks' ? `list_${list_id}` : 'teams';

  try {
    const response = await clickupFetch(endpoint, token);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let detail = '';
      try { detail = JSON.parse(errText)?.err || errText; } catch { detail = errText; }
      throw new Error(`ClickUp API returned ${response.status}: ${detail}`);
    }

    const data = await response.json();

    // Cache the successful response
    await db.collection('clickup_cache').doc(cacheKey).set({
      data,
      lastSynced: new Date().toISOString(),
    });

    return res.status(200).json({
      ...data,
      _cached: false,
      _lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    console.error('ClickUp API error:', err.message);

    // Fall back to cached data
    try {
      const cached = await db.collection('clickup_cache').doc(cacheKey).get();
      if (cached.exists) {
        const cachedData = cached.data();
        return res.status(200).json({
          ...cachedData.data,
          _cached: true,
          _lastSynced: cachedData.lastSynced,
          _error: err.message || 'ClickUp connection unavailable. Showing cached data.',
        });
      }
    } catch (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

    return res.status(502).json({
      error: err.message || 'ClickUp connection unavailable and no cached data found.',
    });
  }
}
