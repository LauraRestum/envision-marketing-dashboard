// /api/clickup.js — Vercel API Route
// Proxies ClickUp API calls so the API token stays server-side.
// Caches responses in Firestore to handle API outages gracefully.

import getAdminDb from './_db.js';

const CLICKUP_BASE = 'https://api.clickup.com/api/v2';
const API_TIMEOUT_MS = 15000; // 15 second timeout for ClickUp API calls

async function clickupFetch(endpoint, token) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // Try raw token first (personal API tokens), then Bearer format (OAuth tokens)
    let response = await fetch(endpoint, {
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (response.status === 401) {
      response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
    }

    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`ClickUp API timed out after ${API_TIMEOUT_MS / 1000}s calling ${endpoint}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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

  // Build endpoint or handle composite actions
  const db = getAdminDb();

  // "projects" action: fetch spaces > folders > lists to get the full project hierarchy
  if (action === 'projects' && team_id) {
    const cacheKey = `projects_${team_id}`;
    try {
      // 1. Get all spaces in the workspace
      const spacesRes = await clickupFetch(`${CLICKUP_BASE}/team/${team_id}/space?archived=false`, token);
      if (!spacesRes.ok) throw new Error(`Spaces API returned ${spacesRes.status}`);
      const spacesData = await spacesRes.json();
      const spaces = spacesData.spaces || [];

      // 2. For each space, get folders (which contain lists) and folderless lists
      const projects = [];
      for (const space of spaces) {
        // Get folders in this space
        const foldersRes = await clickupFetch(`${CLICKUP_BASE}/space/${space.id}/folder?archived=false`, token);
        if (foldersRes.ok) {
          const foldersData = await foldersRes.json();
          for (const folder of (foldersData.folders || [])) {
            for (const list of (folder.lists || [])) {
              projects.push({
                id: list.id,
                name: list.name,
                folder: folder.name,
                space: space.name,
                taskCount: list.task_count,
                status: list.status,
              });
            }
          }
        }

        // Get folderless lists in this space
        const listsRes = await clickupFetch(`${CLICKUP_BASE}/space/${space.id}/list?archived=false`, token);
        if (listsRes.ok) {
          const listsData = await listsRes.json();
          for (const list of (listsData.lists || [])) {
            projects.push({
              id: list.id,
              name: list.name,
              folder: null,
              space: space.name,
              taskCount: list.task_count,
              status: list.status,
            });
          }
        }
      }

      const result = { projects };

      if (db) {
        try {
          await db.collection('clickup_cache').doc(cacheKey).set({ data: result, lastSynced: new Date().toISOString() });
        } catch (cacheErr) {
          console.warn('Cache write skipped:', cacheErr.message);
        }
      }

      return res.status(200).json({ ...result, _cached: false, _lastSynced: new Date().toISOString() });
    } catch (err) {
      console.error('ClickUp projects error:', err.message);
      if (db) {
        try {
          const cached = await db.collection('clickup_cache').doc(cacheKey).get();
          if (cached.exists) {
            const cachedData = cached.data();
            return res.status(200).json({ ...cachedData.data, _cached: true, _lastSynced: cachedData.lastSynced, _error: err.message });
          }
        } catch (cacheErr) { console.error('Cache read error:', cacheErr); }
      }
      return res.status(502).json({ error: err.message });
    }
  }

  let endpoint;
  let cacheKey;
  if (action === 'tasks' && team_id) {
    endpoint = `${CLICKUP_BASE}/team/${team_id}/task?include_closed=false&subtasks=true&page=0`;
    cacheKey = `tasks_${team_id}`;
  } else if (action === 'list_tasks' && list_id) {
    endpoint = `${CLICKUP_BASE}/list/${list_id}/task?include_closed=false&subtasks=true`;
    cacheKey = `list_${list_id}`;
  } else if (action === 'teams') {
    endpoint = `${CLICKUP_BASE}/team`;
    cacheKey = 'teams';
  } else {
    return res.status(400).json({ error: 'Invalid action. Use: teams, projects (with team_id), tasks (with team_id), or list_tasks (with list_id)' });
  }

  try {
    const response = await clickupFetch(endpoint, token);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      let detail = '';
      try { detail = JSON.parse(errText)?.err || errText; } catch { detail = errText; }
      throw new Error(`ClickUp API returned ${response.status}: ${detail}`);
    }

    const data = await response.json();

    // Cache the successful response (skip if Firebase not configured)
    if (db) {
      try {
        await db.collection('clickup_cache').doc(cacheKey).set({
          data,
          lastSynced: new Date().toISOString(),
        });
      } catch (cacheErr) {
        console.warn('Cache write skipped:', cacheErr.message);
      }
    }

    return res.status(200).json({
      ...data,
      _cached: false,
      _lastSynced: new Date().toISOString(),
    });
  } catch (err) {
    console.error('ClickUp API error:', err.message);

    // Fall back to cached data
    if (db) {
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
    }

    return res.status(502).json({
      error: err.message || 'ClickUp connection unavailable and no cached data found.',
    });
  }
}
