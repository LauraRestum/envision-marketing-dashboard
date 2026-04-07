// /api/intake.js — Vercel API Route
// Receives form submissions from the external Marketing Resource Hub
// and writes them to Firestore for the Inbox module.
//
// Full implementation in Phase 3.

export default async function handler(req, res) {
  // CORS headers for external hub
  res.setHeader('Access-Control-Allow-Origin', process.env.EXTERNAL_HUB_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Phase 3: validate payload, write to Firestore
  return res.status(200).json({ success: true, message: 'Intake endpoint ready. Full implementation in Phase 3.' });
}
