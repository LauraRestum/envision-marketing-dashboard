// /api/send-reply.js — Vercel API Route
// Sends email replies to inbox submissions via Resend,
// so replies come from an Envision email address.

import { Resend } from 'resend';
import getAdminDb from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { submissionId, to, submitterName, subject, body } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, and body' });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured. Add RESEND_API_KEY to Vercel environment variables.' });
  }

  const fromAddress = process.env.RESEND_FROM_ADDRESS || 'marketing@envisionus.com';

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: `Envision Marketing <${fromAddress}>`,
      to: [to],
      subject,
      text: body,
    });

    // Log the reply in the submission record
    if (submissionId) {
      try {
        const db = getAdminDb();
        await db.collection('submissions').doc(submissionId).update({
          replySent: true,
          replyText: body,
          repliedAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn('Reply sent but failed to update Firestore record:', dbErr);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Send reply error:', err);
    return res.status(500).json({ error: 'Failed to send email. Check Resend configuration.' });
  }
}
