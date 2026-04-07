// /api/clickup.js — Vercel API Route
// Proxies ClickUp API calls to keep the API token server-side.
//
// Full implementation in Phase 3.

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ success: true, message: 'ClickUp proxy ready. Full implementation in Phase 3.' });
}
