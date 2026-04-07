// /api/format.js — Vercel API Route
// Social Formatter: calls Anthropic Claude API to reformat content
// for multiple social platforms.
//
// Full implementation in Phase 4.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ success: true, message: 'Format endpoint ready. Full implementation in Phase 4.' });
}
