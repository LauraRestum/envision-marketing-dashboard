import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance = null;
let dbFailed = false;

/**
 * Build credentials from either:
 *   1. FIREBASE_SERVICE_ACCOUNT (full JSON string), or
 *   2. Individual env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *      (workaround for Vercel mangling the full JSON)
 */
function getCredential() {
  // Option 1: full JSON
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn('FIREBASE_SERVICE_ACCOUNT JSON parse failed — trying individual env vars.');
    }
  }

  // Option 2: individual env vars
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    return {
      type: 'service_account',
      project_id: projectId,
      client_email: clientEmail,
      // Vercel escapes \n in env vars — restore actual newlines
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

function getAdminDb() {
  if (dbFailed) return null;
  if (dbInstance) return dbInstance;

  try {
    if (getApps().length === 0) {
      const serviceAccount = getCredential();
      if (!serviceAccount) {
        console.warn('Firebase credentials not set — set FIREBASE_SERVICE_ACCOUNT or individual FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars.');
        dbFailed = true;
        return null;
      }
      initializeApp({ credential: cert(serviceAccount) });
    }
    dbInstance = getFirestore();
    return dbInstance;
  } catch (err) {
    console.error('Firebase Admin init failed:', err.message);
    dbFailed = true;
    return null;
  }
}

export default getAdminDb;
