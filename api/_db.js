import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let dbInstance = null;
let dbFailed = false;

function getAdminDb() {
  if (dbFailed) return null;
  if (dbInstance) return dbInstance;

  try {
    if (getApps().length === 0) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) {
        console.warn('FIREBASE_SERVICE_ACCOUNT not set — server-side caching disabled.');
        dbFailed = true;
        return null;
      }
      const serviceAccount = JSON.parse(raw);
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
