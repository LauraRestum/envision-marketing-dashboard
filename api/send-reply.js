// /api/send-reply.js — Vercel API Route
// Sends email replies to inbox submissions via Resend.
//
// Full implementation in Phase 3.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ success: true, message: 'Reply endpoint ready. Full implementation in Phase 3.' });
}
