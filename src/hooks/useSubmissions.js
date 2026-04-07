import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import {
  collection, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc
} from 'firebase/firestore';

export default function useSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.warn('Submissions listener error:', err);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function updateSubmission(id, updates) {
    await updateDoc(doc(db, 'submissions', id), updates);
  }

  async function archiveSubmission(id) {
    await updateDoc(doc(db, 'submissions', id), {
      status: 'archived',
      archivedAt: new Date().toISOString(),
    });
  }

  async function removeSubmission(id) {
    await deleteDoc(doc(db, 'submissions', id));
  }

  function getUnreadCount() {
    return submissions.filter((s) => s.status === 'new').length;
  }

  return { submissions, loading, updateSubmission, archiveSubmission, removeSubmission, getUnreadCount };
}
