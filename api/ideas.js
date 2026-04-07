// /api/ideas.js — Vercel API Route
// AI Content Idea Generator: calls Anthropic Claude API to generate
// content ideas tagged by Envision pillar.
//
// Full implementation in Phase 4.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ success: true, message: 'Ideas endpoint ready. Full implementation in Phase 4.' });
}
