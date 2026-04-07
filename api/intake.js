// /api/intake.js — Vercel API Route
// Receives form submissions from the external Marketing Resource Hub
// and writes them to Firestore for the dashboard Inbox module.

import getAdminDb from './_db.js';

const VALID_TYPES = ['story_submission', 'social_submission', 'contact', 'event_request'];

export default async function handler(req, res) {
  // CORS: allow the external hub domain to POST
  const allowedOrigin = process.env.EXTERNAL_HUB_URL || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, submitterName, submitterEmail, subject, body } = req.body || {};

  // Validate required fields
  if (!type || !body) {
    return res.status(400).json({
      error: 'Missing required fields: type and body are required',
    });
  }

  // Email is required for all types except event_request
  if (!submitterEmail && type !== 'event_request') {
    return res.status(400).json({
      error: 'Missing required field: submitterEmail',
    });
  }

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`,
    });
  }

  // Basic email format check
  if (submitterEmail && !submitterEmail.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const db = getAdminDb();

    if (!db) {
      console.error('Intake: database not available — check FIREBASE_SERVICE_ACCOUNT env var');
      return res.status(500).json({ error: 'Database not available. Please contact the admin.' });
    }

    const submission = {
      type,
      submitterName: submitterName || 'Anonymous',
      submitterEmail: submitterEmail || '',
      subject: subject || '',
      body,
      status: 'new',
      routedTo: null,
      assignedTo: null,
      notes: '',
      replySent: false,
      replyText: '',
      submittedAt: new Date().toISOString(),
      archivedAt: null,
    };

    await db.collection('submissions').add(submission);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Intake write error:', err);
    return res.status(500).json({ error: 'Failed to save submission. Try again.' });
  }
}
